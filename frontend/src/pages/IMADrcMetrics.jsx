import React, { useState, useEffect } from "react";
import { Card, Form, Button, Select, Input, DatePicker, Space, Table, Divider, message, Modal } from "antd";
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
  const [hiddenColumns, setHiddenColumns] = useState([]);
  // 新增导入弹窗
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importQueryText, setImportQueryText] = useState(JSON.stringify(defaultQueryJson, null, 2));
  const [lastQueryJson, setLastQueryJson] = useState(null); // 新增：保存最近一次查询的query
  const [showQueryModal, setShowQueryModal] = useState(false); // 新增：控制弹窗显示
  const [showRequired, setShowRequired] = useState(false); // 新增

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
  const handleSearch = async (customQueryJson) => {
    // 必选校验
    if (
      !dateRange ||
      dateRange.length !== 2 ||
      !queryJson.dataset ||
      !queryJson.table
    ) {
      setShowRequired(true);
      message.warning("请填写所有必选项");
      return;
    }
    setShowRequired(false);
    const usedQuery = customQueryJson || queryJson;
  console.log("Query JSON:", usedQuery);
    setLoading(true);
    setLastQueryJson(usedQuery);
    try {
      const data = await fetchQueryResult(usedQuery);
      setResult(data);
    } catch (e) {
      message.error("查询失败");
    }
    setLoading(false);
  };

  // 导出csv
  const handleExport = () => {
    if (!result.length) {
      message.warning("无数据可导出");
      return;
    }
    const header = Object.keys(result[0]);
    const csv = [
      header.join(","),
      ...result.map(row => header.map(k => row[k]).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 结果表头，支持排序、过滤、隐藏列
  const tableColumns = React.useMemo(() => {
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
      hidden: hiddenColumns.includes(col),
    }));
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
    <div
      style={{
        display: "flex",
        gap: 32,
        alignItems: "flex-start",
        background: "#f5f7fa",
        padding: "32px 0",
        minHeight: "100vh",
        flexWrap: "wrap"
      }}
    >
      {/* 左侧：搜索与条件 */}
      <div
        style={{
          flex: "0 0 380px",
          minWidth: 260,
          maxWidth: 420,
          width: 380,
          boxSizing: "border-box"
        }}
      >
        <Card
          title="New Drc Metrics"
          bordered={false}
          style={{
            boxShadow: "0 2px 12px #0001",
            borderRadius: 10,
            background: "#fff",
            marginBottom: 24,
          }}
        >
          <Form
  layout="inline"
  style={{ marginBottom: 16, display: "flex", justifyContent: "flex-start" }}
>
  <Form.Item
    label="Date"
    required
    validateStatus={showRequired && (!dateRange || dateRange.length !== 2) ? "error" : ""}
    help={showRequired && (!dateRange || dateRange.length !== 2) ? "请选择" : ""}
    style={{ marginRight: 16, width: 200 }}
    labelCol={{ style: { width: 120, textAlign: "right" } }}
    wrapperCol={{ style: { minWidth: 120 } }}
  >
    <RangePicker value={dateRange} onChange={setDateRange} style={{ width: 250 }} />
  </Form.Item>
  <Form.Item
    label="Version"
    style={{ marginRight: 16, width: 200 }}
    labelCol={{ style: { width: 120, textAlign: "right" } }}
    wrapperCol={{ style: { minWidth: 120 } }}
  >
    <Select
      value={queryJson.version}
      onChange={v => setQueryJson(qj => ({ ...qj, version: v }))}
      size="small"
      allowClear
      placeholder="version"
      options={[
        { label: "v1", value: "v1" },
        { label: "v2", value: "v2" },
        { label: "v3", value: "v3" }
      ]}
      style={{ width: 250 }}
    />
  </Form.Item>
  <Form.Item
    label="Dataset"
    required
    validateStatus={showRequired && !queryJson.dataset ? "error" : ""}
    help={showRequired && !queryJson.dataset ? "请选择" : ""}
    style={{ marginRight: 16, width: 200 }}
    labelCol={{ style: { width: 120, textAlign: "right" } }}
    wrapperCol={{ style: { minWidth: 120 } }}
  >
    <Select
      value={queryJson.dataset}
      onChange={v => setQueryJson(qj => ({ ...qj, dataset: v }))}
      size="small"
      placeholder="dataset"
      options={[
        { label: "frtbima_env01", value: "frtbima_env01" },
        { label: "frtbima_env02", value: "frtbima_env02" }
      ]}
      allowClear={false}
      style={{ width: 250 }}
    />
  </Form.Item>
  <Form.Item
    label="Table"
    required
    validateStatus={showRequired && !queryJson.table ? "error" : ""}
    help={showRequired && !queryJson.table ? "请选择" : ""}
    style={{ width: 200 }}
    labelCol={{ style: { width: 120, textAlign: "right" } }}
    wrapperCol={{ style: { minWidth: 120 } }}
  >
    <Select
      value={queryJson.table}
      onChange={v => setQueryJson(qj => ({ ...qj, table: v }))}
      size="small"
      placeholder="table"
      options={[
        { label: "drc_metrics", value: "drc_metrics" },
        { label: "drc_metrics2", value: "drc_metrics2" }
      ]}
      allowClear={false}
      style={{ width: 250 }}
    />
  </Form.Item>
</Form>
          <Divider orientation="left">Main</Divider>
          {filters.map((f, idx) => {
            // 需要变成input的操作符
            const forceInputOps = ["like", "not like", ">", ">=", "<", "<="];
            const isDropdownColumn = ["a", "b", "c"].includes(f.column);
            const useInput =
              isDropdownColumn && forceInputOps.includes(f.operator);

            return (
              <Space key={idx} style={{ marginBottom: 8, flexWrap: "wrap" }}>
                <Select
                  showSearch
                  placeholder="字段"
                  style={{ width: 90 }}
                  value={f.column}
                  onChange={v => handleFilterChange(idx, "column", v)}
                  options={columns.map(col => ({ label: col, value: col }))}
                  allowClear
                  size="small"
                  filterOption={(input, option) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                />
                <Select
                  showSearch
                  placeholder="操作符"
                  style={{ width: 70 }}
                  value={f.operator}
                  onChange={v => handleFilterChange(idx, "operator", v)}
                  options={OPERATOR_OPTIONS}
                  allowClear
                  size="small"
                  filterOption={(input, option) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                />
                {isDropdownColumn && !useInput ? (
                  <Select
                    showSearch
                    mode={f.operator === "in" || f.operator === "not in" ? "multiple" : undefined}
                    placeholder="值"
                    style={{ width: 110 }}
                    value={f.value}
                    onChange={v => handleFilterChange(idx, "value", v)}
                    options={(columnOptions[f.column] || []).map(opt => ({
                      label: opt,
                      value: opt
                    }))}
                    allowClear
                    size="small"
                    filterOption={(input, option) =>
                      option.label.toLowerCase().includes(input.toLowerCase())
                    }
                    maxTagCount={2}
                    maxTagPlaceholder={omittedValues => `+${omittedValues.length}...`}
                  />
                ) : (
                  <Input
                    placeholder={
                      f.operator === "in" || f.operator === "not in"
                        ? "逗号分隔"
                        : "值"
                    }
                    style={{ width: 90 }}
                    value={f.value}
                    size="small"
                    onChange={e => {
                      let val = e.target.value;
                      if (
                        (f.operator === "like" || f.operator === "not like") &&
                        val &&
                        (!val.startsWith("%") || !val.endsWith("%"))
                      ) {
                        if (!val.startsWith("%")) val = "%" + val;
                        if (!val.endsWith("%")) val = val + "%";
                      }
                      handleFilterChange(idx, "value", val);
                    }}
                  />
                )}
                <Button
                  danger
                  size="small"
                  onClick={() => removeFilter(idx)}
                  disabled={filters.length === 1}
                >
                  删除
                </Button>
              </Space>
            );
          })}
          <Button type="dashed" onClick={addFilter} style={{ marginBottom: 16 }} size="small">
            新增Filter
          </Button>
          {/* Metrics */}
          <Divider orientation="left">Metrics</Divider>
          {metrics.map((m, idx) => (
            <Space key={idx} style={{ marginBottom: 8 }}>
              <Select
                placeholder="字段"
                style={{ width: 90 }}
                value={m.column}
                onChange={v => handleMetricChange(idx, "column", v)}
                options={columns.map(col => ({ label: col, value: col }))}
                allowClear
                size="small"
              />
              <Select
                placeholder="聚合"
                style={{ width: 140 }} // 这里加宽
                value={m.agg}
                onChange={v => handleMetricChange(idx, "agg", v)}
                options={AGGREGATE_OPTIONS}
                size="small"
              />
              <Button danger size="small" onClick={() => removeMetric(idx)} disabled={metrics.length === 1}>
                删除
              </Button>
            </Space>
          ))}
          <Button type="dashed" onClick={addMetric} style={{ marginBottom: 16 }} size="small">
            新增Metrics
          </Button>
          {/* Query 编辑框（隐藏，仅交互存在） */}
          <Input.TextArea
            value={queryText}
            onChange={e => setQueryText(e.target.value)}
            rows={10}
            style={{
              display: "none"
            }}
          />
          <div style={{ margin: "16px 0" }}>
            <Button type="primary" onClick={() => handleSearch()} loading={loading} size="small">
              Search
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={handleExport} size="small">
              Export
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => {
              setImportQueryText(JSON.stringify(defaultQueryJson, null, 2));
              setImportModalOpen(true);
            }} size="small">
              Import query
            </Button>
          </div>
          {/* Import Query 弹窗 */}
          <Modal
            title="Import Query"
            open={importModalOpen}
            onOk={() => {
              try {
                const parsed = JSON.parse(importQueryText);
                setQueryJson(parsed);
                setQueryText(JSON.stringify(parsed, null, 2));
                setImportModalOpen(false);
                handleSearch(parsed);
              } catch (e) {
                message.error("JSON 格式错误");
              }
            }}
            onCancel={() => setImportModalOpen(false)}
            okText="Query"
            cancelText="Cancel"
          >
            <Input.TextArea
              value={importQueryText}
              onChange={e => setImportQueryText(e.target.value)}
              rows={12}
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                color: "#222",
                minHeight: 120,
                whiteSpace: "pre"
              }}
            />
          </Modal>
        </Card>
      </div>
      {/* 右侧：结果表格 */}
      <div
        style={{
          flex: "1 1 0%",
          minWidth: 0,
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        <Card
          title="Result"
          bordered={false}
          style={{
            boxShadow: "0 2px 12px #0001",
            borderRadius: 10,
            background: "#fff"
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <span style={{ marginRight: 8 }}>隐藏/显示列：</span>
            <Select
              mode="multiple"
              allowClear
              style={{ minWidth: 180 }}
              placeholder="选择要隐藏的列"
              value={hiddenColumns}
              onChange={setHiddenColumns}
              options={allColumnKeys.map(key => ({ label: key, value: key }))}
              maxTagCount={4}
              size="small"
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
            scroll={{ x: true }}
          />
        </Card>
        {/* 查询入参弹窗 */}
        <Modal
          title="查询入参"
          open={showQueryModal}
          onOk={() => setShowQueryModal(false)}
          onCancel={() => setShowQueryModal(false)}
          okText="关闭"
          cancelButtonProps={{ style: { display: "none" } }}
        >
          <Input.TextArea
            value={JSON.stringify(lastQueryJson, null, 2)}
            readOnly
            rows={12}
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              color: "#222",
              minHeight: 120,
              whiteSpace: "pre"
            }}
          />
        </Modal>
      </div>
    </div>
  );
};

export default NewDrcMetrics;