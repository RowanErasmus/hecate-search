import axios from "axios";
import {
  Concept,
  ConceptExpandRow,
  RelatedConcept,
} from "../@types/data-source";

export const getConceptById = async (id: number): Promise<[Concept]> => {
  const client = axios.create({
    // baseURL: "https://hecate.pantheon-hds.com/api",
    baseURL: "http://localhost:8080/api",
  });

  return client
    .get<[Concept]>(`/concepts/${id}`)
    .then((resp) => {
      return resp.data;
    })
    .catch((err) => {
      throw err;
    });
};

export const getRelatedConcepts = async (
  id: number,
): Promise<[RelatedConcept]> => {
  const client = axios.create({
    // baseURL: "https://hecate.pantheon-hds.com/api",
    baseURL: "http://localhost:8080/api",
  });

  return client
    .get<[RelatedConcept]>(`/concepts/${id}/relationships`)
    .then((resp) => {
      return resp.data;
    })
    .catch((err) => {
      throw err;
    });
};

export const getPhoebeConcepts = async (
  id: number,
): Promise<[RelatedConcept]> => {
  const client = axios.create({
    // baseURL: "https://hecate.pantheon-hds.com/api",
    baseURL: "http://localhost:8080/api",
  });

  return client
    .get<[RelatedConcept]>(`/concepts/${id}/phoebe`)
    .then((resp) => {
      return resp.data;
    })
    .catch((err) => {
      throw err;
    });
};

export const getConceptDefinition = async (id: number): Promise<string> => {
  const client = axios.create({
    // baseURL: "https://hecate.pantheon-hds.com/api",
    baseURL: "http://localhost:8080/api",
  });

  return client
    .get<string>(`/concepts/${id}/definition`)
    .then((resp) => {
      return resp.data;
    })
    .catch((err) => {
      throw err;
    });
};

export const getConceptExpand = async (
  id: number,
): Promise<ConceptExpandRow[]> => {
  const client = axios.create({
    // baseURL: "https://hecate.pantheon-hds.com/v2",
    baseURL: "http://localhost:8081/v2",
  });

  return client
    .get<{ concepts: ConceptExpandRow[] }>(
      `/concepts/${id}/expand?childlevels=5&parentlevels=0`,
    )
    .then((resp) => {
      if (resp.data.concepts[0].children) {
        return resp.data.concepts[0].children;
      } else {
        return [];
      }
    })
    .catch((err) => {
      throw err;
    });
};
