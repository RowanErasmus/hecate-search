import { ConceptRow } from "../@types/data-source";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "../App.css";
import { Button, notification, Table, TableProps, Tag } from "antd";
import { search } from "../service/search.tsx";

type OnChange = NonNullable<TableProps<ConceptRow>["onChange"]>;
type Filters = Parameters<OnChange>[1];

export default function ConceptTable(props: Readonly<{
  searchTerm: string;
  full: boolean;
}>) {
  const { searchTerm, full } = props;
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [filteredInfo, setFilteredInfo] = useState<Filters>({});
  const [loading, setLoading] = useState<boolean>(false);

  const [currentConceptClassFilter, setCurrentConceptClassFilter] =
    useState<string[]>();
  const [currentDomainFilter, setCurrentDomainFilter] = useState<string[]>();
  const [currentValidityFilter, setCurrentValidityFilter] =
    useState<string[]>();
  const [currentStandardFilter, setCurrentStandardFilter] =
    useState<string[]>();
  const [currentVocabFilter, setCurrentVocabFilter] = useState<string[]>();

  const [conceptClassFilter, setConceptClassFilter] = useState<
    { text: string; value: string }[]
  >([]);
  const [domainFilter, setDomainFilter] = useState<
    { text: string; value: string }[]
  >([]);
  const [validityFilter, setValidityFilter] = useState<
    { text: string; value: string }[]
  >([]);
  const [standardFilter, setStandardFilter] = useState<
    { text: string; value: string }[]
  >([]);
  const [vocabFilter, setVocabFilter] = useState<
    { text: string; value: string }[]
  >([]);

  const clearFilters = () => {
    setFilteredInfo({
      concept_class_id: null,
      domain_id: null,
      invalid_reason: null,
      standard_concept: null,
      vocabulary_id: null,
    });
    setCurrentConceptClassFilter(undefined);
    setCurrentDomainFilter(undefined);
    setCurrentValidityFilter(undefined);
    setCurrentStandardFilter(undefined);
    setCurrentVocabFilter(undefined);
    setSelected(originalData);
  };

  const handleChange: OnChange = (_pagination, filters) => {
    setFilteredInfo(filters);
    const concept_classes = filters.concept_class_id?.toString().split(",");
    setCurrentConceptClassFilter(concept_classes);
    const domains = filters.domain_id?.toString().split(",");
    setCurrentDomainFilter(domains);
    const validity = filters.invalid_reason?.toString().split(",");
    setCurrentValidityFilter(validity);
    const standard = filters.standard_concept?.toString().split(",");
    setCurrentStandardFilter(standard);
    const vocabularies = filters.vocabulary_id?.toString().split(",");
    setCurrentVocabFilter(vocabularies);
  };

  // If due to a result of the filter there is only one child we don't want to expand
  function filterData() {
    const filteredSelection: ConceptRow[] = [...originalData].map((row) => {
      if (row.children && row.children.length > 1) {
        let acceptedChildren: ConceptRow[] = [...row.children];
        if (currentConceptClassFilter && currentConceptClassFilter.length > 0) {
          acceptedChildren = acceptedChildren.filter((child) =>
            currentConceptClassFilter?.includes(child.concept_class_id[0]),
          );
        }
        if (currentDomainFilter && currentDomainFilter.length > 0) {
          acceptedChildren = acceptedChildren.filter((child) =>
            currentDomainFilter?.includes(child.domain_id[0]),
          );
        }
        if (currentValidityFilter && currentValidityFilter.length > 0) {
          acceptedChildren = acceptedChildren.filter((child) =>
            currentValidityFilter?.includes(child.invalid_reason[0]),
          );
        }
        if (currentStandardFilter && currentStandardFilter.length > 0) {
          acceptedChildren = acceptedChildren.filter((child) =>
            currentStandardFilter?.includes(child.standard_concept[0]),
          );
        }
        if (currentVocabFilter && currentVocabFilter.length > 0) {
          acceptedChildren = acceptedChildren.filter((child) =>
            currentVocabFilter?.includes(child.vocabulary_id[0]),
          );
        }
        if (acceptedChildren.length === 1) {
          return { ...acceptedChildren[0] };
        } else {
          const newRow = { ...row };
          newRow.children = [...acceptedChildren];
          if (acceptedChildren.length === 2) {
          }
          return newRow;
        }
      }
      return { ...row };
    });
    setSelected(filteredSelection);
  }

  function applyFilterForConceptsWithChildren(children: ConceptRow[]) {
    if (!filteredInfo) {
      return children;
    }
    let filtered: ConceptRow[] = [...children];
    if (filteredInfo?.concept_class_id) {
      filtered = filtered.filter((child) =>
        filteredInfo?.concept_class_id?.includes(child.concept_class_id[0]),
      );
    }
    if (filteredInfo?.domain_id) {
      filtered = filtered.filter((child) =>
        filteredInfo?.domain_id?.includes(child.domain_id[0]),
      );
    }
    if (filteredInfo?.invalid_reason) {
      filtered = filtered.filter((child) =>
        filteredInfo?.invalid_reason?.includes(child.invalid_reason[0]),
      );
    }
    if (filteredInfo?.standard_concept) {
      filtered = filtered.filter((child) =>
        filteredInfo?.standard_concept?.includes(child.standard_concept[0]),
      );
    }
    if (filteredInfo?.vocabulary_id) {
      filtered = filtered.filter((child) =>
        filteredInfo?.vocabulary_id?.includes(child.vocabulary_id[0]),
      );
    }
    return filtered;
  }

  const columns: TableProps<ConceptRow>["columns"] = [
    {
      title: "",
      dataIndex: "",
      key: "concept_id",
      width: 1,
    },
    {
      title: "id",
      dataIndex: "concept_id",
      key: "concept_id",
      align: "left",
      minWidth: 105,
      render: (value, record) => (
        <div style={{ textAlign: "left" }}>
          {record.concept_id ? value : record.children?.length + " concepts"}
        </div>
      ),
    },
    {
      title: "code",
      dataIndex: "concept_code",
      key: "concept_code",
      minWidth: 120,
      responsive: full ? ["md"] : ["xxl"],
    },
    {
      title: "name",
      dataIndex: "concept_name",
      key: "concept_name",
      minWidth: 150,
      render: (value, row, index) => {
        if (row.children) {
          return (
            <Link
              key={index + value}
              to="/"
              style={{ color: "#01452c", pointerEvents: "none" }}
            >
              {value}
            </Link>
          );
        } else {
          return (
            <Link
              key={index + value}
              to={`/concepts/${row.concept_id}`}
              style={{ color: "#01452c" }}
            >
              {value}
            </Link>
          );
        }
      },
      sorter: (a, b) => a.concept_name.localeCompare(b.concept_name),
    },
    {
      title: "class",
      dataIndex: "concept_class_id",
      key: "concept_class_id",
      filteredValue: filteredInfo.concept_class_id,
      filters: conceptClassFilter,
      responsive: full ? ["md"] : ["xxl"],
      render: (_, row) => {
        if (row.children) {
          const filtered = applyFilterForConceptsWithChildren(row.children);
          if (filtered.length === 1) {
            return filtered[0].concept_class_id[0];
          }
          return (
            <>
              {[
                ...new Set(
                  filtered.map((r) =>
                    r.concept_class_id ? r.concept_class_id[0] : "",
                  ),
                ),
              ].map((tag) => {
                return <Tag key={tag}>{tag}</Tag>;
              })}
            </>
          );
        } else {
          return row.concept_class_id;
        }
      },
      onFilter: (value, record) =>
        record["concept_class_id"].toString().includes(value.toString()),
    },
    {
      title: "domain",
      dataIndex: "domain_id",
      key: "domain_id",
      filteredValue: filteredInfo.domain_id,
      filters: domainFilter,
      responsive: full ? ["md"] : ["xxl"],
      onFilter: (value, record) => record.domain_id.includes(value as string),
      render: (_, row) => {
        if (row.children) {
          const filtered = applyFilterForConceptsWithChildren(row.children);
          if (filtered.length === 1) {
            return filtered[0].domain_id[0];
          }
          return (
            <>
              {[
                ...new Set(
                  filtered.map((r) => (r.domain_id ? r.domain_id[0] : "")),
                ),
              ].map((tag) => {
                return <Tag key={tag}>{tag}</Tag>;
              })}
            </>
          );
        } else {
          return row.domain_id;
        }
      },
    },
    {
      title: "validity",
      dataIndex: "invalid_reason",
      key: "invalid_reason",
      filteredValue: filteredInfo.invalid_reason,
      filters: validityFilter,
      responsive: full ? ["lg"] : ["xxl"],
      onFilter: (value, record) =>
        record.invalid_reason.includes(value as string),
      render: (_, row) => {
        if (row.children) {
          const filtered = applyFilterForConceptsWithChildren(row.children);
          if (filtered.length === 1) {
            return filtered[0].invalid_reason ? filtered[0].invalid_reason : "";
          } else {
            return (
              <>
                {[
                  ...new Set(
                    filtered.map((r) =>
                      r.invalid_reason ? r.invalid_reason[0] : "",
                    ),
                  ),
                ].map((tag) => {
                  return <Tag key={tag}>{tag}</Tag>;
                })}
              </>
            );
          }
        } else {
          return row.invalid_reason;
        }
      },
    },
    {
      title: "concept",
      dataIndex: "standard_concept",
      key: "standard_concept",
      responsive: ["md"],
      filteredValue: filteredInfo.standard_concept,
      filters: standardFilter,
      onFilter: (value, record) =>
        record.standard_concept.includes(value as string),
      render: (_, row) => {
        if (row.children) {
          const filtered = applyFilterForConceptsWithChildren(row.children);
          if (filtered.length === 1) {
            return filtered[0].standard_concept[0];
          }
          return (
            <>
              {[
                ...new Set(
                  [...filtered].map((r) =>
                    r.standard_concept ? r.standard_concept[0] : "",
                  ),
                ),
              ].map((tag) => {
                return <Tag key={tag}>{tag}</Tag>;
              })}
            </>
          );
        } else {
          return row.standard_concept;
        }
      },
    },
    {
      title: "vocabulary",
      dataIndex: "vocabulary_id",
      key: "vocabulary_id",
      responsive: ["sm"],
      filteredValue: filteredInfo.vocabulary_id,
      filters: vocabFilter,
      onFilter: (value, record) =>
        record.vocabulary_id.includes(value as string),
      render: (_, row) => {
        if (row.children) {
          const filtered = applyFilterForConceptsWithChildren(row.children);
          if (filtered.length === 1) {
            return filtered[0].vocabulary_id[0];
          }
          return (
            <>
              {[
                ...new Set(
                  filtered.map((r) =>
                    r.vocabulary_id ? r.vocabulary_id[0] : "",
                  ),
                ),
              ].map((tag) => {
                return <Tag key={tag}>{tag}</Tag>;
              })}
            </>
          );
        } else {
          return row.vocabulary_id;
        }
      },
    },
    {
      title: "score",
      dataIndex: "score",
      key: "score",
      render: (value) => Math.round((value + Number.EPSILON) * 1000) / 1000,
      sorter: (a, b) => a.score - b.score,
      responsive: full ? ["xxl"] : ["md"],
    },
  ];
  const [selected, setSelected] = useState<ConceptRow[]>([]);
  const [originalData, setOriginalData] = useState<ConceptRow[]>([]);

  function createCountForFilter(concepts: string[]) {
    const counts = concepts.reduce((p, c) => {
      const name: string = c;
      if (!Object.hasOwn(p, name)) {
        // @ts-expect-error
        p[name as keyof typeof p] = 0;
      }
      p[name as keyof typeof p]++;
      return p;
    }, {});
    return Object.keys(counts).map((k) => {
      return {
        text: k + " (" + counts[k as keyof typeof counts] + ")",
        value: k,
      };
    });
  }

  function getFilterSelector(
    field:
      | "domain_id"
      | "vocabulary_id"
      | "invalid_reason"
      | "concept_class_id"
      | "standard_concept",
    row: ConceptRow[],
  ) {
    const concepts: string[] = [];
    row.forEach((r) => {
      if (r.children) {
        r.children.forEach((child) => concepts.push(child[field][0]));
      } else {
        concepts.push(r[field][0]);
      }
    });
    concepts.sort((a, b) => a.localeCompare(b));
    return createCountForFilter(concepts);
  }

  const openNotification = () => {
    notification.error({
      message: `Oops`,
      description:
        "Something went wrong, get in touch report issues to info@pantheon-hds.com",
      placement: "topRight",
    });
  };

  useEffect(() => {
    doSearch(searchTerm);
  }, [searchTerm]);

  function doSearch(q: string) {
    setLoading(true);
    search(q)
      .then((r) => {
        setLoading(false);
        setCurrentPage(1);
        setConceptClassFilter(getFilterSelector("concept_class_id", r));
        setDomainFilter(getFilterSelector("domain_id", r));
        setValidityFilter(getFilterSelector("invalid_reason", r));
        setStandardFilter(getFilterSelector("standard_concept", r));
        setVocabFilter(getFilterSelector("vocabulary_id", r));
        setSelected(r);
        setOriginalData(r);
      })
      .catch(() => {
        openNotification();
        setLoading(false);
      });
  }

  useEffect(() => {
    filterData();
  }, [
    currentConceptClassFilter,
    currentDomainFilter,
    currentValidityFilter,
    currentStandardFilter,
    currentVocabFilter,
    originalData,
  ]);

  return (
    <div>
      {(filteredInfo.concept_class_id ||
        filteredInfo.domain_id ||
        filteredInfo.invalid_reason ||
        filteredInfo.standard_concept ||
        filteredInfo.vocabulary_id) && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ marginRight: "auto", textAlign: "left" }}>
            <div>Applied filters:</div>
            {filteredInfo.concept_class_id && (
              <div>
                class:{" "}
                {filteredInfo.concept_class_id.map((d) => (
                  <Tag key={d.toString()}>{d.toString()}</Tag>
                ))}
              </div>
            )}
            {filteredInfo.domain_id && (
              <div>
                domain:{" "}
                {filteredInfo.domain_id.map((d) => (
                  <Tag key={d.toString()}>{d.toString()}</Tag>
                ))}
              </div>
            )}
            {filteredInfo.invalid_reason && (
              <div>
                validity:{" "}
                {filteredInfo.invalid_reason.map((d) => (
                  <Tag key={d.toString()}>{d.toString()}</Tag>
                ))}
              </div>
            )}
            {filteredInfo.standard_concept && (
              <div>
                standard concept:{" "}
                {filteredInfo.standard_concept.map((d) => (
                  <Tag key={d.toString()}>{d.toString()}</Tag>
                ))}
              </div>
            )}
            {filteredInfo.vocabulary_id && (
              <div>
                vocabulary:{" "}
                {filteredInfo.vocabulary_id.map((d) => (
                  <Tag key={d.toString()}>{d.toString()}</Tag>
                ))}
              </div>
            )}
          </div>
          <Button onClick={clearFilters}>clear filters</Button>
        </div>
      )}
      <Table
        rowKey={(record) => record.concept_id + record.concept_name}
        style={{ paddingTop: "1em", fontSize: "8px" }}
        columns={columns}
        onChange={handleChange}
        dataSource={selected}
        expandable={{
          childrenColumnName: "",
          indentSize: 5,
          expandedRowClassName: "expand-row",
        }}
        pagination={{
          current: currentPage,
          onChange: (page) => {
            setCurrentPage(page);
          },
          defaultCurrent: 1,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        }}
        loading={loading}
      />
    </div>
  );
}
