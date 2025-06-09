import React, { useState, useEffect } from "react";
import { Card, Form, Button, Select, Input, DatePicker, Space, Table, Divider, message } from "antd";
import dayjs from "dayjs";

// 假设接口：获取所有字段名
async function fetchColumns() {
  return ["a", "b", "c", "d", "e", "f"];
}

// 假设接口：获取下拉选项
async function fetchColumnOptions() {
  return {
    a: ["A1", "A2", "A3"],
    b: ["B1", "B2"],
    c: ["C1", "C2", "C3", "C4"]
  };
}

// 假设接口：执行 bigquery 查询
async function fetchQueryResult(queryJson) {
  return [
    { a: "A1", b: "B2", count_a: 10, sum_d: 100 },
    { a: "A2", b: "B1", count_a: 5, sum_d: 50 }
  ];
}

const OPERATOR_OPTIONS = [
  { label: "=", value: "=" },
  { label: "!=", value: "!=" },
  { label: ">", value: ">" },
  { label: ">=", value: ">=" },
  { label: "<", value: "<" },
  { label: "<=", value: "<=" },
  { label: "in", value: "in" },
  { label: "not in", value: "not in" },
  { label: "like", value: "like" },
  { label: "not like", value: "not like" }
];

const AGGREGATE_OPTIONS = [
  { label: "count", value: "count" },
  { label: "sum", value: "sum" },
  { label: "uniq", value: "uniq" }
];

const { RangePicker } = DatePicker;

const defaultQueryJson = {
  version: "",
  dataset: "frtbima_env01",
  table: "drc_metrics",
  fields: [],
  aggregates: [],
  conditions: { and: [] },
  groupBy: [],
  orderBy: "",
  limit: null,
  offset: null
};

const NewDrcMetrics = () => {
  const [columns, setColumns] = useState([]);
  const [columnOptions, setColumnOptions] = useState({});
  const [dateRange, setDateRange] = useState([]);
  const [filters, setFilters] = useState([
    { column: undefined, operator: "=", value: undefined }
  ]);
  const [metrics, setMetrics] = useState([
    { column: undefined, agg: "count" }
  ]);
  const [queryJson, setQueryJson] = useState(defaultQueryJson);
  const [queryText, setQueryText] = useState(JSON.stringify(defaultQueryJson, null, 2));
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState([]); // 新增隐藏列的 state

  // 初始化字段和下拉选项
  useEffect(() => {
    fetchColumns().then(setColumns);
    fetchColumnOptions().then(setColumnOptions);
  }, []);

  // 生成 queryJson
  useEffect(() => {
    // 1. 处理 conditions
    const and = [];
    if (dateRange && dateRange.length === 2) {
      and.push({
        field: "Date",
        operator: ">=",
        value: dayjs(dateRange[0]).format("YYYY-MM-DD")
      });
      and.push({
        field: "Date",
        operator: "<=",
        value: dayjs(dateRange[1]).format("YYYY-MM-DD")
      });
    }
    filters.forEach(f => {
      if (f.column && f.operator && f.value !== undefined && f.value !== "") {
        let val = f.value;
        // 处理 in/not in: 支持字符串逗号分隔转数组
        if ((f.operator === "in" || f.operator === "not in")) {
          if (typeof val === "string") {
            val = val.split(",").map(s => s.trim()).filter(Boolean);
          }
        }
        // 处理 like/not like: 自动加%%
        if ((f.operator === "like" || f.operator === "not like") && typeof val === "string") {
          if (!val.startsWith("%")) val = "%" + val;
          if (!val.endsWith("%")) val = val + "%";
        }
        and.push({
          field: f.column,
          operator: f.operator,
          value: val
        });
      }
    });

    // 2. fields: 选择了column但未填value的column
    const fields = filters
      .filter(f => f.column && (f.value === undefined || f.value === ""))
      .map(f => f.column);

    // 3. aggregates
    const aggregates = metrics
      .filter(m => m.column && m.agg)
      .map(m => `${m.agg}(${m.column}) as ${m.agg}_${m.column}`);

    // 组装 queryJson
    const qj = {
      ...defaultQueryJson,
      fields,
      aggregates,
      conditions: { and }
    };
    setQueryJson(qj);
    setQueryText(JSON.stringify(qj, null, 2));
  }, [dateRange, filters, metrics, columns]);

  // Filter行变化
  const handleFilterChange = (idx, key, value) => {
    setFilters(fs => {
      const next = [...fs];
      next[idx] = { ...next[idx], [key]: value };
      // 如果column变了，重置value
      if (key === "column") {
        next[idx].value = undefined;
      }
      return next;
    });
  };

  // 新增Filter
  const addFilter = () => {
    setFilters(fs => [...fs, { column: undefined, operator: "=", value: undefined }]);
  };

  // 删除Filter
  const removeFilter = idx => {
    setFilters(fs => fs.filter((_, i) => i !== idx));
  };

  // Metrics行变化
  const handleMetricChange = (idx, key, value) => {
    setMetrics(ms => {
      const next = [...ms];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  // 新增Metrics
  const addMetric = () => {
    setMetrics(ms => [...ms, { column: undefined, agg: "count" }]);
  };

  // 删除Metrics
  const removeMetric = idx => {
    setMetrics(ms => ms.filter((_, i) => i !== idx));
  };

  // 查询
  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await fetchQueryResult(queryJson);
      setResult(data);
    } catch (e) {
      message.error("查询失败");
    }
    setLoading(false);
  };

  // 结果表头，支持排序、过滤、隐藏列
  const tableColumns = React.useMemo(() => {
    // 1. 从 queryJson.fields 拿字段
    const fieldCols = (queryJson.fields || []).map(col => ({
      title: col,
      dataIndex: col,
      key: col,
      sorter: (a, b) => (a[col] > b[col] ? 1 : -1),
      filters: result.length
        ? Array.from(new Set(result.map(r => r[col]))).map(v => ({
            text: String(v),
            value: v,
          }))
        : [],
      onFilter: (value, record) => record[col] === value,
      // 隐藏列
      hidden: hiddenColumns.includes(col),
    }));
    // 2. 从 queryJson.aggregates 拿聚合别名
    const aggCols = (queryJson.aggregates || []).map(agg => {
      const match = agg.match(/as\s+([a-zA-Z0-9_]+)/i);
      const key = match ? match[1] : agg;
      return {
        title: key,
        dataIndex: key,
        key,
        sorter: (a, b) => (a[key] > b[key] ? 1 : -1),
        filters: result.length
          ? Array.from(new Set(result.map(r => r[key]))).map(v => ({
              text: String(v),
              value: v,
            }))
          : [],
        onFilter: (value, record) => record[key] === value,
        hidden: hiddenColumns.includes(key),
      };
    });
    // 只返回未隐藏的列
    return [...fieldCols, ...aggCols].filter(col => !col.hidden);
  }, [queryJson.fields, queryJson.aggregates, result, hiddenColumns]);

  // 生成所有可选列用于隐藏/显示
  const allColumnKeys = React.useMemo(() => {
    const keys = [
      ...(queryJson.fields || []),
      ...(queryJson.aggregates || []).map(agg => {
        const match = agg.match(/as\s+([a-zA-Z0-9_]+)/i);
        return match ? match[1] : agg;
      }),
    ];
    return keys;
  }, [queryJson.fields, queryJson.aggregates]);

  return (
    <Card title="New Drc Metrics" style={{ maxWidth: 1100, margin: "40px auto" }}>
      {/* Date 区间 */}
      <Form layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="Date">
          <RangePicker value={dateRange} onChange={setDateRange} />
        </Form.Item>
      </Form>
      {/* Filter */}
      <Divider orientation="left">Filter</Divider>
      {filters.map((f, idx) => (
        <Space key={idx} style={{ marginBottom: 8 }}>
          <Select
            showSearch
            placeholder="选择字段"
            style={{ width: 180 }}
            value={f.column}
            onChange={v => handleFilterChange(idx, "column", v)}
            options={columns.map(col => ({ label: col, value: col }))}
            allowClear
            filterOption={(input, option) =>
              option.label.toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            showSearch
            placeholder="操作符"
            style={{ width: 100 }}
            value={f.operator}
            onChange={v => handleFilterChange(idx, "operator", v)}
            options={OPERATOR_OPTIONS}
            allowClear
            filterOption={(input, option) =>
              option.label.toLowerCase().includes(input.toLowerCase())
            }
          />
          {/* value: 下拉或输入框 */}
          {["a", "b", "c"].includes(f.column) ? (
            <Select
              showSearch
              mode={f.operator === "in" || f.operator === "not in" ? "multiple" : undefined}
              placeholder="选择值"
              style={{ width: 180 }}
              value={f.value}
              onChange={v => handleFilterChange(idx, "value", v)}
              options={(columnOptions[f.column] || []).map(opt => ({
                label: opt,
                value: opt
              }))}
              allowClear
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
              maxTagCount={3}
              maxTagPlaceholder={omittedValues => `+${omittedValues.length}...`}
            />
          ) : (
            <Input
              placeholder={
                f.operator === "in" || f.operator === "not in"
                  ? "用英文逗号分隔多个值"
                  : "输入值"
              }
              style={{ width: 140 }}
              value={f.value}
              onChange={e => {
                let val = e.target.value;
                // like/not like 自动加%%
                if ((f.operator === "like" || f.operator === "not like") && val && (!val.startsWith("%") || !val.endsWith("%"))) {
                  if (!val.startsWith("%")) val = "%" + val;
                  if (!val.endsWith("%")) val = val + "%";
                }
                handleFilterChange(idx, "value", val);
              }}
            />
          )}
          <Button danger onClick={() => removeFilter(idx)} disabled={filters.length === 1}>
            删除
          </Button>
        </Space>
      ))}
      <Button type="dashed" onClick={addFilter} style={{ marginBottom: 16 }}>
        新增Filter
      </Button>
      {/* Metrics */}
      <Divider orientation="left">Metrics</Divider>
      {metrics.map((m, idx) => (
        <Space key={idx} style={{ marginBottom: 8 }}>
          <Select
            placeholder="选择字段"
            style={{ width: 120 }}
            value={m.column}
            onChange={v => handleMetricChange(idx, "column", v)}
            options={columns.map(col => ({ label: col, value: col }))}
            allowClear
          />
          <Select
            placeholder="聚合"
            style={{ width: 100 }}
            value={m.agg}
            onChange={v => handleMetricChange(idx, "agg", v)}
            options={AGGREGATE_OPTIONS}
          />
          <Button danger onClick={() => removeMetric(idx)} disabled={metrics.length === 1}>
            删除
          </Button>
        </Space>
      ))}
      <Button type="dashed" onClick={addMetric} style={{ marginBottom: 16 }}>
        新增Metrics
      </Button>
      {/* Query 编辑框 */}
      <Divider orientation="left">Query</Divider>
      <Input.TextArea
        value={queryText}
        onChange={e => setQueryText(e.target.value)}
        rows={10}
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: 14,
          color: "#222",
          marginBottom: 16,
          minHeight: 120,
          whiteSpace: "pre"
        }}
      />
      <div style={{ margin: "16px 0" }}>
        <Button type="primary" onClick={handleSearch} loading={loading}>
          Search
        </Button>
      </div>
      {/* 结果表格 */}
      <Divider orientation="left">Result</Divider>
      <div style={{ marginBottom: 8 }}>
        <span style={{ marginRight: 8 }}>隐藏/显示列：</span>
        <Select
          mode="multiple"
          allowClear
          style={{ minWidth: 220 }}
          placeholder="选择要隐藏的列"
          value={hiddenColumns}
          onChange={setHiddenColumns}
          options={allColumnKeys.map(key => ({ label: key, value: key }))}
          maxTagCount={4}
        />
      </div>
      <Table
        dataSource={result}
        columns={tableColumns}
        rowKey={(r, i) => i}
        loading={loading}
        pagination={false}
        bordered
        size="small"
      />
    </Card>
  );
};

export default NewDrcMetrics;