import React, { useState, useEffect } from "react";
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
  DatePicker,
  Modal,
} from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

// 假设接口：返回book和metrics的可选项（一次性全部获取）
async function fetchBookMetricsList() {
  // 实际应为: await fetch(`/api/bookmetrics`).then(res=>res.json())
  // 模拟返回
  return {
    book: ["book1", "apple", "apple2"],
    metrics: ["metric1", "metric2", "apple_metric"],
  };
}

// 假设接口：查询数据
async function fetchQueryResult(queryJson) {
  // 实际应为: await fetch('/api/query', {method:'POST', body: JSON.stringify(queryJson)}).then(res=>res.json())
  return [
    { CobDate: "2024-06-01", Desk: "desk1", Book: "book1", Metric: "metric1" },
    { CobDate: "2024-06-02", Desk: "desk2", Book: "apple", Metric: "metric2" },
  ];
}

const DESK_OPTIONS = [
  { label: "desk1", value: "desk1" },
  { label: "desk2", value: "desk2" },
  { label: "desk3", value: "desk3" },
];

const SmartSearch = () => {
  const [form] = Form.useForm();
  const [dateRange, setDateRange] = useState([]);
  const [desk, setDesk] = useState([]);
  const [allBookOptions, setAllBookOptions] = useState([]);
  const [allMetricsOptions, setAllMetricsOptions] = useState([]);
  const [book, setBook] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [queryJson, setQueryJson] = useState({});
  const [result, setResult] = useState([]);
  const [loading, setLoading] = useState(false);

  // 弹窗相关
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [bookSearchVal, setBookSearchVal] = useState("");
  const [metricsSearchVal, setMetricsSearchVal] = useState("");
  const [bookSearchResult, setBookSearchResult] = useState([]);
  const [metricsSearchResult, setMetricsSearchResult] = useState([]);

  // 支持弹窗内多选
  const [bookModalSelected, setBookModalSelected] = useState([]);
  const [metricsModalSelected, setMetricsModalSelected] = useState([]);

  // 新增两个 state 标记是否已点过搜索
  const [bookSearched, setBookSearched] = useState(false);
  const [metricsSearched, setMetricsSearched] = useState(false);

  // 首次加载时获取全部book和metrics
  useEffect(() => {
    fetchBookMetricsList().then((res) => {
      console.log("Fetched book and metrics options:", res);

      setAllBookOptions(res.book.map((b) => ({ label: b, value: b })));
      setAllMetricsOptions(res.metrics.map((m) => ({ label: m, value: m })));
    });
  }, []);

  // 修改 handleBookModalSearch
  const handleBookModalSearch = () => {
    setBookSearched(true); // 标记已点过搜索
    if (!bookSearchVal) {
      setBookSearchResult([]);
      return;
    }
    setBookSearchResult(
      allBookOptions.filter((item) =>
        item.value.toLowerCase().includes(bookSearchVal.toLowerCase())
      )
    );
  };

  // 修改 handleMetricsModalSearch
  const handleMetricsModalSearch = () => {
    setMetricsSearched(true); // 标记已点过搜索
    if (!metricsSearchVal) {
      setMetricsSearchResult([]);
      return;
    }
    setMetricsSearchResult(
      allMetricsOptions.filter((item) =>
        item.value.toLowerCase().includes(metricsSearchVal.toLowerCase())
      )
    );
  };

  // 添加Book（多选）
  const handleAddBook = () => {
    const newVals = bookModalSelected.filter(val => !book.includes(val));
    setBook([...book, ...newVals]);
    setBookModalOpen(false);
    setBookSearchVal("");
    setBookSearchResult([]);
    setBookModalSelected([]);
  };

  // 添加Metrics（多选）
  const handleAddMetrics = () => {
    const newVals = metricsModalSelected.filter(val => !metrics.includes(val));
    setMetrics([...metrics, ...newVals]);
    setMetricsModalOpen(false);
    setMetricsSearchVal("");
    setMetricsSearchResult([]);
    setMetricsModalSelected([]);
  };

  // 删除Book
  const handleBookChange = (vals) => setBook(vals);

  // 删除Metrics
  const handleMetricsChange = (vals) => setMetrics(vals);

  // 拼接 where 条件
  const buildConditions = () => {
    const and = [];

    // Date 区间
    if (dateRange && dateRange.length === 2) {
      and.push({
        field: "CobDate",
        operator: ">=",
        value: dayjs(dateRange[0]).format("YYYY-MM-DD"),
      });
      and.push({
        field: "CobDate",
        operator: "<=",
        value: dayjs(dateRange[1]).format("YYYY-MM-DD"),
      });
    }

    // Desk
    if (desk && desk.length > 0) {
      and.push({
        field: "Desk",
        operator: desk.length === 1 ? "=" : "in",
        value: desk.length === 1 ? desk[0] : desk,
      });
    }

    // Book
    if (book && book.length > 0) {
      and.push({
        field: "Book",
        operator: book.length === 1 ? "=" : "in",
        value: book.length === 1 ? book[0] : book,
      });
    }

    // Metrics
    if (metrics && metrics.length > 0) {
      and.push({
        field: "Metric",
        operator: metrics.length === 1 ? "=" : "in",
        value: metrics.length === 1 ? metrics[0] : metrics,
      });
    }

    return { and };
  };

  // 组装最终查询json
  const buildQueryJson = () => {
    return {
      version: "",
      dataset: "frtbima_env01",
      table: "drc_metics",
      fields: [],
      aggregates: [],
      conditions: buildConditions(),
      groupBy: [],
      orderBy: "",
      limit: null,
      offset: null,
    };
  };

  // 监听变化自动生成json
  React.useEffect(() => {
    setQueryJson(buildQueryJson());
    // eslint-disable-next-line
  }, [dateRange, desk, book, metrics]);

  // 查询
  const handleSearch = async () => {
    setLoading(true);
    const query = buildQueryJson();
    setQueryJson(query);
    // 去掉“加载一秒”的假延迟，直接查
    const data = await fetchQueryResult(query);
    setResult(data);
    setLoading(false);
  };

  // 导出Excel
  const handleExport = () => {
    if (!result.length) return;
    const header = Object.keys(result[0]);
    const csv = [
      header.join(","),
      ...result.map((row) => header.map((k) => row[k]).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 允许手动编辑 queryJson
  const handleQueryJsonChange = (e) => {
    const val = e.target.value;
    setQueryJson(val);
    try {
      const obj = JSON.parse(val);
      // 只同步你关心的字段
      if (obj.conditions && obj.conditions.and) {
        // 解析并同步到 state（这里只做简单示例，实际可更细致）
        obj.conditions.and.forEach(cond => {
          if (cond.field === "CobDate" && cond.operator === ">=") {
            setDateRange(prev => [dayjs(cond.value), prev?.[1] || null]);
          }
          if (cond.field === "CobDate" && cond.operator === "<=") {
            setDateRange(prev => [prev?.[0] || null, dayjs(cond.value)]);
          }
          if (cond.field === "Desk") {
            setDesk(cond.operator === "in" ? cond.value : [cond.value]);
          }
          if (cond.field === "Book") {
            setBook(cond.operator === "in" ? cond.value : [cond.value]);
          }
          if (cond.field === "Metric") {
            setMetrics(cond.operator === "in" ? cond.value : [cond.value]);
          }
        });
      }
    } catch (err) {
      // 非法JSON不处理
    }
  };

  return (
    <Card title="Smart Search" style={{ maxWidth: 1100, margin: "40px auto" }}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col>
            <Form.Item label="Date">
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item label="Desk">
              <Select
                mode="multiple"
                style={{ width: 180 }}
                options={DESK_OPTIONS}
                value={desk}
                onChange={setDesk}
                placeholder="Select Desk"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item label="Book">
  <Input.Group compact>
    <Select
      mode="multiple"
      style={{ width: 140 }}
      value={book}
      onChange={handleBookChange}
      open={false}
      placeholder="点击右侧添加"
      allowClear
    />
    <Button
      size="small"
      type="link"
      onClick={() => setBookModalOpen(true)}
      style={{ verticalAlign: "top" }}
    >
      添加
    </Button>
  </Input.Group>
</Form.Item>
          </Col>
          <Col>
            <Form.Item label="Metrics">
  <Input.Group compact>
    <Select
      mode="multiple"
      style={{ width: 140 }}
      value={metrics}
      onChange={handleMetricsChange}
      open={false}
      placeholder="点击右侧添加"
      allowClear
    />
    <Button
      size="small"
      type="link"
      onClick={() => setMetricsModalOpen(true)}
      style={{ verticalAlign: "top" }}
    >
      添加
    </Button>
  </Input.Group>
</Form.Item>
          </Col>
        </Row>
        {/* Book 弹窗 */}
        <Modal
          title="搜索Book"
          open={bookModalOpen}
          width={500} // 设置弹窗宽度
          onCancel={() => {
            setBookModalOpen(false);
            setBookSearchVal("");
            setBookSearchResult([]);
            setBookModalSelected([]);
            setBookSearched(false); // 重置
          }}
          footer={
            <Button
              type="primary"
              onClick={handleAddBook}
              disabled={bookModalSelected.length === 0}
            >
              添加所选
            </Button>
          }
        >
          <Input.Search
            placeholder="输入关键字后点击搜索"
            value={bookSearchVal}
            onChange={e => setBookSearchVal(e.target.value)}
            onSearch={handleBookModalSearch}
            enterButton="Search"
            style={{ marginBottom: 12 }}
          />
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            value={bookModalSelected}
            options={bookSearchResult}
            onChange={setBookModalSelected}
            placeholder="请选择"
            maxTagCount={6}
            notFoundContent={null}
          />
          {/* 只在已点过搜索后显示匹配行数 */}
          {bookSearched && (
            <div style={{ marginTop: 8, color: "#888" }}>
              匹配 {bookSearchResult.length} 条
            </div>
          )}
        </Modal>
        {/* Metrics 弹窗 */}
        <Modal
          title="搜索Metrics"
          open={metricsModalOpen}
          width={500} // 设置弹窗宽度
          onCancel={() => {
            setMetricsModalOpen(false);
            setMetricsSearchVal("");
            setMetricsSearchResult([]);
            setMetricsModalSelected([]);
            setMetricsSearched(false); // 重置
          }}
          footer={
            <Button
              type="primary"
              onClick={handleAddMetrics}
              disabled={metricsModalSelected.length === 0}
            >
              添加所选
            </Button>
          }
        >
          <Input.Search
            placeholder="输入关键字后点击搜索"
            value={metricsSearchVal}
            onChange={e => setMetricsSearchVal(e.target.value)}
            onSearch={handleMetricsModalSearch}
            enterButton="Search"
            style={{ marginBottom: 12 }}
          />
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            value={metricsModalSelected}
            options={metricsSearchResult}
            onChange={setMetricsModalSelected}
            placeholder="请选择"
            maxTagCount={6}
            notFoundContent={null}
          />
          {/* 只在已点过搜索后显示匹配行数 */}
          {metricsSearched && (
            <div style={{ marginTop: 8, color: "#888" }}>
              匹配 {metricsSearchResult.length} 条
            </div>
          )}
        </Modal>
        <Divider orientation="left">Query</Divider>
        <Input.TextArea
          value={typeof queryJson === "string" ? queryJson : JSON.stringify(queryJson, null, 2)}
          rows={8}
          readOnly={false}
          style={{ fontFamily: "monospace", background: "#f7f7f7" }}
          onChange={handleQueryJsonChange}
        />
        <div style={{ margin: "16px 0" }}>
          <Button type="primary" onClick={handleSearch} loading={loading}>
            Search
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={handleExport}>
            Export
          </Button>
        </div>
        <Divider orientation="left">Result</Divider>
        <Table
          dataSource={result}
          columns={[
            { title: "CobDate", dataIndex: "CobDate", key: "CobDate" },
            { title: "Desk", dataIndex: "Desk", key: "Desk" },
            { title: "Book", dataIndex: "Book", key: "Book" },
            { title: "Metric", dataIndex: "Metric", key: "Metric" },
          ]}
          rowKey={(r, i) => i}
          loading={loading}
          pagination={false}
        />
      </Form>
    </Card>
  );
};

export default SmartSearch;