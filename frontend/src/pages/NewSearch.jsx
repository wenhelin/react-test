import React, { useState } from "react";
import {
  Card,
  Form,
  Select,
  Button,
  Row,
  Col,
  Input,
  Table,
  Divider,
  Space,
} from "antd";

// 假设接口
async function fetchTableSchema(table) {
  if (table === "drc_metrics") {
    return {
      drc_metrics: [
        "CobDate",
        "Agg_name",
        "Desk",
        "Value",
        "Region",
        "MetricType",
        "Status",
      ],
    };
  }
  return { [table]: [] };
}

// 假设查询接口
async function fetchQueryResult(queryJson) {
  // 实际应为: await fetch('/api/query', {method:'POST', body: JSON.stringify(queryJson)}).then(res=>res.json())
  return [
    { CobDate: "2024-06-01", Agg_name: "agg1", Desk: "desk1" },
    { CobDate: "2024-06-02", Agg_name: "agg2", Desk: "desk2" },
  ];
}

const TABLE_OPTIONS = [
  { label: "drc_metrics", value: "drc_metrics" },
];

const SQL_OPERATORS = [
  { label: "=", value: "=" },
  { label: ">", value: ">" },
  { label: "<", value: "<" },
  { label: ">=", value: ">=" },
  { label: "<=", value: "<=" },
  { label: "<>", value: "<>" },
  { label: "LIKE", value: "LIKE" },
  { label: "IN", value: "IN" },
];

const LOGIC_OPTIONS = [
  { label: "AND", value: "AND" },
  { label: "OR", value: "OR" },
];

const AGGREGATE_TYPES = [
  { label: "count", value: "count" },
  { label: "sum", value: "sum" },
  { label: "uniq", value: "uniq" },
];

// 构建条件json
const buildConditions = (whereRows) => {
  if (!whereRows.length || !whereRows.some((row) => row.field && row.value !== "")) {
    return { and: [] };
  }
  return {
    and: whereRows
      .filter((row) => row.field && row.value !== "")
      .map((row) => ({
        field: row.field,
        operator: row.op, // 注意这里是 operator
        value: row.value,
      })),
  };
};

// 构建聚合json
const buildAggregates = (aggs) => {
  return aggs
    .filter((agg) => agg.type && agg.field)
    .map(
      (agg) => `${agg.type}(${agg.field}) as ${agg.type}_${agg.field}`
    );
};

const SearchPage = () => {
  const [form] = Form.useForm();
  const [schema, setSchema] = useState([]);
  const [fields, setFields] = useState([]);
  const [groupBy, setGroupBy] = useState([]);
  const [whereRows, setWhereRows] = useState([
    { field: undefined, op: "=", value: "", logic: "AND" },
  ]);
  const [aggregations, setAggregations] = useState([]);
  const [queryJson, setQueryJson] = useState({});
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  // 选择表后获取schema
  const handleTableChange = async (table) => {
    form.setFieldsValue({ fields: [], groupBy: [] });
    setFields([]);
    setGroupBy([]);
    setWhereRows([{ field: undefined, op: "=", value: "", logic: "AND" }]);
    setAggregations([]);
    setQueryJson({});
    setResult([]);
    setLoading(false);
    const res = await fetchTableSchema(table);
    const schemaList = res[table] || [];
    setSchema(schemaList);
  };

  // fields/groupby多选
  const handleFieldsChange = (vals) => setFields(vals);
  const handleGroupByChange = (vals) => setGroupBy(vals);

  // where条件行操作
  const handleWhereChange = (idx, key, value) => {
    const rows = [...whereRows];
    rows[idx][key] = value;
    setWhereRows(rows);
  };
  const addWhereRow = () => {
    setWhereRows([
      ...whereRows,
      { field: undefined, op: "=", value: "", logic: "AND" },
    ]);
  };
  const removeWhereRow = (idx) => {
    setWhereRows(whereRows.filter((_, i) => i !== idx));
  };

  // aggregation操作
  const handleAggChange = (idx, key, value) => {
    const aggs = [...aggregations];
    aggs[idx][key] = value;
    setAggregations(aggs);
  };
  const addAggRow = () => {
    setAggregations([
      ...aggregations,
      { type: undefined, field: undefined },
    ]);
  };
  const removeAggRow = (idx) => {
    setAggregations(aggregations.filter((_, i) => i !== idx));
  };

  // 构建json
  const buildQueryJson = () => {
    const table = form.getFieldValue("table") || "";
    return {
      version: "",
      dataset: "frtbima_env01",
      table,
      fields,
      aggregates: buildAggregates(aggregations),
      conditions: buildConditions(whereRows),
      groupBy: groupBy.length ? groupBy : [],
      orderBy: "",
      limit: null,
      offset: null,
    };
  };

  // 监听表单变化自动生成json
  React.useEffect(() => {
    setQueryJson(buildQueryJson());
    // eslint-disable-next-line
  }, [fields, groupBy, whereRows, aggregations, form.getFieldValue("table")]);

  // 查询
  const handleSearch = async () => {
    setLoading(true);
    const query = buildQueryJson();
    setQueryJson(query);
    const data = await fetchQueryResult(query);
    setResult(data);
    setLoading(false);
  };

  return (
    <Card title="BigQuery Search" style={{ maxWidth: 1100, margin: "40px auto" }}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col>
            <Form.Item label="Table" name="table" rules={[{ required: true }]}>
              <Select
                style={{ width: 200 }}
                options={TABLE_OPTIONS}
                onChange={handleTableChange}
                placeholder="Select Table"
              />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item label="Fields" name="fields">
              <Select
                mode="multiple"
                style={{ width: 220 }}
                options={schema.map((s) => ({ label: s, value: s }))}
                value={fields}
                onChange={handleFieldsChange}
                placeholder="Select Fields"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item label="Group By" name="groupBy">
              <Select
                mode="multiple"
                style={{ width: 220 }}
                options={schema.map((s) => ({ label: s, value: s }))}
                value={groupBy}
                onChange={handleGroupByChange}
                placeholder="Select Group By"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
        <Divider orientation="left">Where</Divider>
        {whereRows.map((row, idx) => (
          <Row gutter={8} key={idx} style={{ marginBottom: 8 }}>
            <Col>
              <Select
                style={{ width: 150 }}
                placeholder="Field"
                value={row.field}
                options={schema.map((s) => ({ label: s, value: s }))}
                onChange={(val) => handleWhereChange(idx, "field", val)}
                allowClear
              />
            </Col>
            <Col>
              <Select
                style={{ width: 90 }}
                placeholder="Operator"
                value={row.op}
                options={SQL_OPERATORS}
                onChange={(val) => handleWhereChange(idx, "op", val)}
              />
            </Col>
            <Col>
              <Input
                style={{ width: 160 }}
                placeholder="Value"
                value={row.value}
                onChange={(e) => handleWhereChange(idx, "value", e.target.value)}
              />
            </Col>
            <Col>
              <Select
                style={{ width: 80 }}
                value={row.logic}
                options={LOGIC_OPTIONS}
                onChange={(val) => handleWhereChange(idx, "logic", val)}
                disabled={idx === 0}
              />
            </Col>
            <Col>
              <Button danger onClick={() => removeWhereRow(idx)} disabled={whereRows.length === 1}>
                删除
              </Button>
            </Col>
          </Row>
        ))}
        <Button type="dashed" onClick={addWhereRow} style={{ marginBottom: 16 }}>
          添加条件
        </Button>
        <Divider orientation="left">Aggregates</Divider>
        {aggregations.map((agg, idx) => (
          <Row gutter={8} key={idx} style={{ marginBottom: 8 }}>
            <Col>
              <Select
                style={{ width: 120 }}
                placeholder="Type"
                value={agg.type}
                options={AGGREGATE_TYPES}
                onChange={(val) => handleAggChange(idx, "type", val)}
              />
            </Col>
            <Col>
              <Select
                style={{ width: 180 }}
                placeholder="Field"
                value={agg.field}
                options={schema.map((s) => ({ label: s, value: s }))}
                onChange={(val) => handleAggChange(idx, "field", val)}
                allowClear
              />
            </Col>
            <Col>
              <Button danger onClick={() => removeAggRow(idx)} disabled={aggregations.length === 1}>
                删除
              </Button>
            </Col>
          </Row>
        ))}
        <Button type="dashed" onClick={addAggRow} style={{ marginBottom: 16 }}>
          添加Aggression
        </Button>
        <Divider orientation="left">Query JSON</Divider>
        <Input.TextArea
          value={JSON.stringify(queryJson, null, 2)}
          rows={20}
          readOnly
          style={{ fontFamily: "monospace", background: "#f7f7f7" }}
        />
        <div style={{ margin: "16px 0" }}>
          <Button type="primary" onClick={handleSearch} loading={loading}>
            Search
          </Button>
        </div>
        <Divider orientation="left">Result</Divider>
        <Table
          dataSource={result}
          columns={[
            { title: "CobDate", dataIndex: "CobDate", key: "CobDate" },
            { title: "Agg_name", dataIndex: "Agg_name", key: "Agg_name" },
            { title: "Desk", dataIndex: "Desk", key: "Desk" },
          ]}
          rowKey={(r, i) => i}
          loading={loading}
          pagination={false}
        />
      </Form>
    </Card>
  );
};

export default SearchPage;