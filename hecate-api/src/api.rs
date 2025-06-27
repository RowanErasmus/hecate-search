use crate::domain::SearchResponse;
use crate::embeddings::fetch_embeddings;
use crate::errors::PgError;
use crate::umls::get_umls_definition_from_nlm;
use crate::{StateWrapper, db};
use actix_web::web::{Data, Json, Query};
use actix_web::{Error, HttpResponse, get, web};
use log::info;
use qdrant_client::qdrant::condition::ConditionOneOf;
use qdrant_client::qdrant::point_id::PointIdOptions;
use qdrant_client::qdrant::{
    Condition, Filter, GetPointsBuilder, PointId, QueryPointsBuilder, RecommendInputBuilder,
    RetrievedPoint, ScoredPoint, ScrollPointsBuilder, SearchPointsBuilder,
};
use qdrant_client::{Qdrant, qdrant};
use serde::Deserialize;

pub const COLLECTION_NAME: &str = "meddra";

#[derive(Deserialize)]
struct Parameters {
    q: String,
}

#[get("/api/search")]
async fn search(
    parameters: Query<Parameters>,
    state: Data<StateWrapper>,
) -> Result<Json<Vec<SearchResponse>>, Error> {
    let client = &state.qdrant_client;
    let input = parameters.q.as_str();
    let lowercase_input = input.to_lowercase();
    info!("Received search request for {:?}", &input);
    let opt_existing = state.concept_index.get(lowercase_input.as_str());
    let mut to_return: Vec<SearchResponse> = Vec::new();
    let mut ids: Vec<String> = Vec::new();
    if opt_existing.is_none() {
        info!("Nothing found in search index");
        let pg_client = state.pg_pool.get().await.map_err(PgError::PoolError)?;
        let numeric_id = input.parse::<i32>();
        let concepts = match numeric_id {
            Ok(_) => db::get_concept_name_by_number(&pg_client, numeric_id.unwrap()).await?,
            Err(_) => db::get_concept_name_by_string(&pg_client, input.to_string()).await?,
        };

        if !concepts.is_empty() {
            for c in concepts {
                let lower = c.to_lowercase();
                info!("{}", lower);
                let res = state.concept_index.get(lower.as_str());
                if let Some(item) = res {
                    item.iter().for_each(|x| ids.push(x.to_string()))
                } else {
                    let results: Vec<RetrievedPoint> =
                        find_by_concept_name_lower(client, lower, COLLECTION_NAME).await;
                    results.iter().for_each(|x| {
                        if let PointIdOptions::Uuid(id) =
                            x.clone().id.unwrap().point_id_options.unwrap()
                        {
                            ids.push(id.to_string());
                        }
                    });
                }
            }
        } else {
            let recommendations = recommend(input.to_string(), client).await;
            for sp in recommendations {
                let mut concept: SearchResponse = SearchResponse::from(sp);
                // case desensification
                let mut contains_case_insensitive_exact_match = false;
                to_return = to_return
                    .into_iter()
                    .map(|mut every| {
                        if every.concept_name_lower.eq(&concept.concept_name_lower) {
                            every.append_concepts(&mut concept.concepts);
                            contains_case_insensitive_exact_match = true;
                            every
                        } else {
                            every
                        }
                    })
                    .collect();
                if !contains_case_insensitive_exact_match {
                    to_return.push(concept);
                }
            }
            return Ok(Json(to_return));
        }
    } else {
        opt_existing
            .unwrap()
            .iter()
            .for_each(|x| ids.push(x.to_string()));
    }
    let mut points: Vec<PointId> = Vec::new();
    let mut recs = RecommendInputBuilder::default();
    for id in ids {
        points.push(PointId::from(id.as_str()));
        recs = recs.add_positive(PointId::from(id.as_str()));
    }
    create_response_from_vector_db_ids(client, to_return, recs, points).await
}

#[get("/api/concepts/{id}")]
async fn get_concept_by_id(
    path: web::Path<i32>,
    state: Data<StateWrapper>,
) -> Result<HttpResponse, Error> {
    let id = path.into_inner();
    info!("Get concept {}", &id);
    let pg_client = state.pg_pool.get().await.map_err(PgError::PoolError)?;
    let concept = db::get_concept_by_id(&pg_client, id).await?;
    Ok(HttpResponse::Ok().json([concept]))
}

#[get("/api/concepts/{id}/relationships")]
async fn get_concept_relationships(
    path: web::Path<i32>,
    state: Data<StateWrapper>,
) -> Result<HttpResponse, Error> {
    let id = path.into_inner();
    info!("Get concept {} relationships", &id);
    let pg_client = state.pg_pool.get().await.map_err(PgError::PoolError)?;
    let concept = db::get_concept_relationships(&pg_client, id).await?;
    Ok(HttpResponse::Ok().json(concept))
}

#[get("/api/concepts/{id}/phoebe")]
async fn get_concept_phoebe(
    path: web::Path<i32>,
    state: Data<StateWrapper>,
) -> Result<HttpResponse, Error> {
    let id = path.into_inner();
    info!("Get concept {} phoebe", &id);
    let pg_client = state.pg_pool.get().await.map_err(PgError::PoolError)?;
    let concept = db::get_concept_phoebe(&pg_client, id).await?;
    Ok(HttpResponse::Ok().json(concept))
}

#[get("/api/concepts/{id}/definition")]
async fn get_concept_definition(
    path: web::Path<i32>,
    state: Data<StateWrapper>,
) -> Result<HttpResponse, Error> {
    Ok(HttpResponse::Ok().json("this feature is currently disabled"))
    // let id = path.into_inner();
    // info!("Get concept {} definition", &id);
    // let pg_client = state.pg_pool.get().await.map_err(PgError::PoolError)?;
    // let concept = db::get_concept_by_id(&pg_client, id).await?;
    // let def = get_umls_definition_from_nlm(concept.concept_name)
    //     .await
    //     .unwrap()
    //     .unwrap_or("No definition available".parse()?);
    // Ok(HttpResponse::Ok().json(def))
}

async fn create_response_from_vector_db_ids(
    client: &Qdrant,
    mut to_return: Vec<SearchResponse>,
    recs: RecommendInputBuilder,
    points: Vec<PointId>,
) -> Result<Json<Vec<SearchResponse>>, Error> {
    let search_result = retrieve_point_from_db(client, points, COLLECTION_NAME).await;
    let query_points_builder = QueryPointsBuilder::new(COLLECTION_NAME)
        .with_payload(true)
        .score_threshold(0.50)
        .limit(99)
        .query(recs.build());
    let neighbours = client.query(query_points_builder).await.unwrap().result;
    for retrieved_point in search_result {
        let mut concept = SearchResponse::from(retrieved_point);
        let mut didwehit = false;
        to_return = to_return
            .into_iter()
            .map(|mut every| {
                if every.concept_name_lower.eq(&concept.concept_name_lower) {
                    every.append_concepts(&mut concept.concepts);
                    didwehit = true;
                    every
                } else {
                    every
                }
            })
            .collect();
        if !didwehit {
            to_return.push(concept);
        }
    }
    for scored_point in neighbours {
        let mut concept = SearchResponse::from(scored_point);
        let mut didwehit = false;
        to_return = to_return
            .into_iter()
            .map(|mut every| {
                if every.concept_name_lower.eq(&concept.concept_name_lower) {
                    every.append_concepts(&mut concept.concepts);
                    didwehit = true;
                    every
                } else {
                    every
                }
            })
            .collect();
        if !didwehit {
            to_return.push(concept);
        }
    }

    Ok(Json(to_return))
}

async fn find_by_concept_name_lower(
    client: &Qdrant,
    concept_name_lower: String,
    collection: &str,
) -> Vec<RetrievedPoint> {
    client
        .scroll(
            ScrollPointsBuilder::new(collection).filter(Filter::must([Condition {
                condition_one_of: Some(ConditionOneOf::Field(qdrant::FieldCondition {
                    key: "concept_name_lower".to_string(),
                    r#match: Some(qdrant::Match {
                        match_value: Some(concept_name_lower.to_string().into()),
                    }),
                    range: None,
                    geo_bounding_box: None,
                    geo_radius: None,
                    values_count: None,
                    geo_polygon: None,
                    datetime_range: None,
                    is_empty: None,
                    is_null: None,
                })),
            }])),
        )
        .await
        .unwrap()
        .result
}

async fn retrieve_point_from_db(
    client: &Qdrant,
    points: Vec<PointId>,
    collection: &str,
) -> Vec<RetrievedPoint> {
    client
        .get_points(
            GetPointsBuilder::new(collection, points)
                .with_vectors(false)
                .with_payload(true),
        )
        .await
        .unwrap()
        .result
}

async fn recommend(input: String, client: &Qdrant) -> Vec<ScoredPoint> {
    let vector = fetch_embeddings(input).await.unwrap().embedding;
    client
        .search_points(SearchPointsBuilder::new(COLLECTION_NAME, vector, 100).with_payload(true))
        .await
        .unwrap()
        .result
}
