import React, { useState, useEffect } from "react";
import { Card, Form, Button, Select, Input, DatePicker, Space, Table, Divider, message, Modal } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

// Mock API: fetch all column names
async function fetchColumns() {
  return ["a", "b", "c", "d", "e", "f"];
}

// Mock API: fetch dropdown options
async function fetchColumnOptions() {
  return {
    a: ["A1", "A2", "A3"],
    b: ["B1", "B2"],
    c: ["C1", "C2", "C3", "C4"]
  };
}

// Mock API: fetch query result, returns { code: 200, data: { list: [...] } }
async function fetchQueryResult(queryJson) {
  // Simulate different columns for demo
  if (queryJson.table === "drc_metrics2") {
    return {
      code: 200,
      data: {
        list: [
          { x: "X1", y: "Y2", sum_z: 100 },
          { x: "X2", y: "Y1", sum_z: 50 }
        ]
      }
    };
  }
  // Default mock
  return {
    code: 200,
    data: {
      list: [
        { a: "A1", b: "B2", c: "C1", d: "D1", e: "E1", f: "F1" },
        { a: "A2", b: "B1", c: "C2", d: "D2", e: "E2", f: "F2" }
      ]
    }
  };
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
  const [tableColumns, setTableColumns] = useState([]); // <-- dynamic columns
  const [loading, setLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importQueryText, setImportQueryText] = useState(JSON.stringify(defaultQueryJson, null, 2));
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [showRequired, setShowRequired] = useState(false);

  // Init columns and dropdown options
  useEffect(() => {
    fetchColumns().then(setColumns);
    fetchColumnOptions().then(setColumnOptions);
  }, []);

  // Generate queryJson
  useEffect(() => {
    // 1. Handle conditions
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
        // Handle in/not in: support comma separated string to array
        if ((f.operator === "in" || f.operator === "not in")) {
          if (typeof val === "string") {
            val = val.split(",").map(s => s.trim()).filter(Boolean);
          }
        }
        // Handle like/not like: auto add %%
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

    // 2. fields: columns with no value
    const fields = filters
      .filter(f => f.column && (f.value === undefined || f.value === ""))
      .map(f => f.column);

    // 3. aggregates
    const aggregates = metrics
      .filter(m => m.column && m.agg)
      .map(m => `${m.agg}(${m.column}) as ${m.agg}_${m.column}`);

    // Build queryJson
    const qj = {
      ...defaultQueryJson,
      fields,
      aggregates,
      conditions: { and }
    };
    setQueryJson(qj);
    setQueryText(JSON.stringify(qj, null, 2));
  }, [dateRange, filters, metrics, columns]);

  // Helper to set table columns from data
  const updateTableColumns = (list) => {
    if (!list || list.length === 0) {
      setTableColumns([]);
      return;
    }
    const keys = Object.keys(list[0]);
    setTableColumns(
      keys.map(col => ({
        title: col,
        dataIndex: col,
        key: col,
        sorter: (a, b) => (a[col] > b[col] ? 1 : -1),
        filters: Array.from(new Set(list.map(r => r[col]))).map(v => ({
          text: String(v),
          value: v,
        })),
        onFilter: (value, record) => record[col] === value,
      }))
    );
  };

  // Search
  const handleSearch = async (customQueryJson) => {
    // Required validation
    if (
      !dateRange ||
      dateRange.length !== 2 ||
      !queryJson.dataset ||
      !queryJson.table
    ) {
      setShowRequired(true);
      message.warning("Please fill all required fields");
      return;
    }
    setShowRequired(false);
    const usedQuery = customQueryJson || queryJson;
    setLoading(true);
    try {
      const res = await fetchQueryResult(usedQuery);
      if (res.code === 200 && res.data && Array.isArray(res.data.list)) {
        setResult(res.data.list);
        updateTableColumns(res.data.list);
      } else {
        setResult([]);
        setTableColumns([]);
        message.error("No data returned");
      }
    } catch (e) {
      setResult([]);
      setTableColumns([]);
      message.error("Query failed");
    }
    setLoading(false);
  };

  // Filter row change
  const handleFilterChange = (idx, key, value) => {
    setFilters(fs => {
      const next = [...fs];
      next[idx] = { ...next[idx], [key]: value };
      // Reset value if column changed
      if (key === "column") {
        next[idx].value = undefined;
      }
      return next;
    });
  };

  // Add filter row
  const addFilter = () => {
    setFilters(fs => [...fs, { column: undefined, operator: "=", value: undefined }]);
  };

  // Remove filter row
  const removeFilter = idx => {
    setFilters(fs => fs.filter((_, i) => i !== idx));
  };

  // Metric row change
  const handleMetricChange = (idx, key, value) => {
    setMetrics(ms => {
      const next = [...ms];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  // Add metric row
  const addMetric = () => {
    setMetrics(ms => [...ms, { column: undefined, agg: "count" }]);
  };

  // Remove metric row
  const removeMetric = idx => {
    setMetrics(ms => ms.filter((_, i) => i !== idx));
  };

  // Export CSV
  const handleExport = () => {
    if (!result.length) {
      message.warning("No data to export");
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
    a.download = "IMA-DRCMetrics-" + dayjs().format("YYYYMMDD-HHmm") + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };


  // All columns for hide/show
  // const allColumnKeys = React.useMemo(() => {
  //   const keys = [
  //     ...(queryJson.fields || []),
  //     ...(queryJson.aggregates || []).map(agg => {
  //       const match = agg.match(/as\s+([a-zA-Z0-9_]+)/i);
  //       return match ? match[1] : agg;
  //     }),
  //   ];
  //   return keys;
  // }, [queryJson.fields, queryJson.aggregates]);

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
      {/* Left: Search and conditions */}
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
          title="Drc Metrics"
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
              help={showRequired && (!dateRange || dateRange.length !== 2) ? "Please select" : ""}
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
              help={showRequired && !queryJson.dataset ? "Please select" : ""}
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
              help={showRequired && !queryJson.table ? "Please select" : ""}
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
            // Operators that require input
            const forceInputOps = ["like", "not like", ">", ">=", "<", "<="];
            const isDropdownColumn = ["a", "b", "c"].includes(f.column);
            const useInput =
              isDropdownColumn && forceInputOps.includes(f.operator);

            return (
              <Space key={idx} style={{ marginBottom: 8, flexWrap: "wrap" }}>
                <Select
                  showSearch
                  placeholder="Field"
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
                  placeholder="Operator"
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
                    placeholder="Value"
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
                        ? "Comma separated"
                        : "Value"
                    }
                    style={{ width: 90 }}
                    value={f.value}
                    size="small"
                    onChange={e => {
                      let val = e.target.value;
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
                  Delete
                </Button>
              </Space>
            );
          })}
          <Button type="dashed" onClick={addFilter} style={{ marginBottom: 16 }} size="small">
            Add Filter
          </Button>
          {/* Metrics */}
          <Divider orientation="left">Metrics</Divider>
          {metrics.map((m, idx) => (
            <Space key={idx} style={{ marginBottom: 8 }}>
              <Select
                placeholder="Field"
                style={{ width: 90 }}
                value={m.column}
                onChange={v => handleMetricChange(idx, "column", v)}
                options={columns.map(col => ({ label: col, value: col }))}
                allowClear
                size="small"
              />
              <Select
                placeholder="Aggregate"
                style={{ width: 140 }}
                value={m.agg}
                onChange={v => handleMetricChange(idx, "agg", v)}
                options={AGGREGATE_OPTIONS}
                size="small"
              />
              <Button danger size="small" onClick={() => removeMetric(idx)} disabled={metrics.length === 1}>
                Delete
              </Button>
            </Space>
          ))}
          <Button type="dashed" onClick={addMetric} style={{ marginBottom: 16 }} size="small">
            Add Metric
          </Button>
          {/* Query editor (hidden, for interaction only) */}
          <Input.TextArea
            value={queryText}
            onChange={e => setQueryText(e.target.value)}
            rows={10}
            style={{
              display: "none"
            }}
          />
          <div style={{ margin: "16px 0" }}>
            <Button icon={<SearchOutlined />} type="primary" onClick={() => handleSearch()} loading={loading} size="small">
              Search
            </Button>
            <Button icon={<DownloadOutlined />} type="primary" style={{ marginLeft: 8, background: "#26B99A" }} onClick={handleExport} size="small">
              Export
            </Button>
            <Button
              icon={<DownloadOutlined />}
              type="primary"
              style={{ marginLeft: 8, background: "#26B99A" }}
              size="small"
              onClick={() => setShowQueryModal(true)}
            >
              Export Query
            </Button>
          </div>
          <div style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center" }}>
            <Button
              icon={<SearchOutlined />}
              type="primary"
              size="small"
              onClick={() => {
                setImportQueryText(JSON.stringify(defaultQueryJson, null, 2));
                setImportModalOpen(true);
              }}
            >
              Import Query
            </Button>
          </div>
          {/* Import Query Modal */}
          <Modal
            title="Import Query"
            open={importModalOpen}
            //onOk={handleImportQuery}
            onCancel={() => setImportModalOpen(false)}
            okText="Query"
            cancelText="Cancel"
            width="80vw"
            style={{ top: 24, padding: 0 }}
            bodyStyle={{ height: "70vh", padding: 24 }}
          >
            <Input.TextArea
              value={importQueryText}
              onChange={e => setImportQueryText(e.target.value)}
              rows={18}
              style={{
                fontFamily: "monospace",
                fontSize: 15,
                color: "#222",
                minHeight: "50vh",
                whiteSpace: "pre"
              }}
            />
          </Modal>
          {/* Export Query Modal */}
          <Modal
            title="Export Query"
            open={showQueryModal}
            onOk={() => setShowQueryModal(false)}
            onCancel={() => setShowQueryModal(false)}
            okText="Close"
            cancelButtonProps={{ style: { display: "none" } }}
            width="80vw"
            style={{ top: 24, padding: 0 }}
            bodyStyle={{ height: "70vh", padding: 24 }}
          >
            <Input.TextArea
              value={JSON.stringify(queryJson, null, 2)}
              readOnly
              rows={18}
              style={{
                fontFamily: "monospace",
                fontSize: 15,
                color: "#222",
                minHeight: "50vh",
                whiteSpace: "pre"
              }}
            />
          </Modal>
        </Card>
      </div>
      {/* Right: Result table */}
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
      </div>
    </div>
  );
};

export default NewDrcMetrics;