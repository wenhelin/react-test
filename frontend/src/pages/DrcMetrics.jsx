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
  message,
} from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

// 假设接口：返回book和metrics的可选项（一次性全部获取）
// async function fetchBookMetricsList() {
//   // 实际应为: await fetch(`/api/bookmetrics`).then(res=>res.json())
//   // 模拟返回
//   return {
//     book: ["book1", "apple", "apple2", "book2"],
//     metrics: ["metric1", "metric2", "apple_metric"],
//   };
// }

async function fetchBookMetricsList() {
  // 生成1000个book和1000个metrics
  const book = Array.from({ length: 1000 }, (_, i) => `book${i + 1}`);
  const metrics = Array.from({ length: 1000 }, (_, i) => `metric${i + 1}`);
  return {
    book,
    metrics,
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
  const [queryText, setQueryText] = useState("");

  // 确认弹窗
  const [confirmVisible, setConfirmVisible] = useState(false);

  // Book弹窗分页相关
  const [bookPage, setBookPage] = useState(1);
  const [bookPageSize, setBookPageSize] = useState(5);

  // Metrics弹窗分页相关
  const [metricsPage, setMetricsPage] = useState(1);
  const [metricsPageSize, setMetricsPageSize] = useState(5);

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

  // Search handler: show confirm modal first
  const handleSearch = () => {
    setConfirmVisible(true);
  };

  // Confirm modal OK
  const handleConfirmOk = async () => {
    setConfirmVisible(false);
    message.info(queryText); // Show query in message
    setLoading(true);
    // Use buildQueryJson for actual query
    const query = buildQueryJson();
    setQueryJson(query);
    const data = await fetchQueryResult(query);
    setResult(data);
    setLoading(false);
  };

  // Confirm modal Cancel
  const handleConfirmCancel = () => {
    setConfirmVisible(false);
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

  // 监听条件变化自动生成 queryText（每行一个条件的“伪SQL”语句）
  useEffect(() => {
    const obj = buildQueryJson();
    setQueryJson(obj);
    if (obj.conditions && obj.conditions.and) {
      const lines = obj.conditions.and.map(cond => {
        let valueStr = "";
        if (cond.operator === "in" && Array.isArray(cond.value)) {
          valueStr =
            '(' +
            cond.value.map(v => (typeof v === "string" ? `"${v}"` : v)).join(", ") +
            ')';
        } else if (typeof cond.value === "string") {
          valueStr = `"${cond.value}"`;
        } else {
          valueStr = String(cond.value);
        }
        return `${cond.field} ${cond.operator} ${valueStr}`;
      });
      setQueryText(lines.join("\n"));
    } else {
      setQueryText("");
    }
    // eslint-disable-next-line
  }, [dateRange, desk, book, metrics]);

  // 允许手动编辑 queryText
  const handleQueryTextChange = (e) => {
    setQueryText(e.target.value);
  };

  // Book弹窗：分页后的数据
  const pagedBookSearchResult = bookSearchResult.slice(
    (bookPage - 1) * bookPageSize,
    bookPage * bookPageSize
  );
  // Metrics弹窗：分页后的数据
  const pagedMetricsSearchResult = metricsSearchResult.slice(
    (metricsPage - 1) * metricsPageSize,
    metricsPage * metricsPageSize
  );

  // Book弹窗上方显示已选
  const renderSelectedBooks = () => (
    <div style={{ marginBottom: 8 }}>
      <b>已选Book：</b>
      {bookModalSelected.length === 0 ? (
        <span style={{ color: "#aaa" }}>无</span>
      ) : (
        bookModalSelected.map(val => (
          <span
            key={val}
            style={{
              display: "inline-block",
              background: "#e6f7ff",
              borderRadius: 4,
              padding: "2px 8px",
              marginRight: 6,
              marginBottom: 2,
              fontSize: 13,
            }}
          >
            {val}
          </span>
        ))
      )}
    </div>
  );

  // Metrics弹窗上方显示已选
  const renderSelectedMetrics = () => (
    <div style={{ marginBottom: 8 }}>
      <b>已选Metrics：</b>
      {metricsModalSelected.length === 0 ? (
        <span style={{ color: "#aaa" }}>无</span>
      ) : (
        metricsModalSelected.map(val => (
          <span
            key={val}
            style={{
              display: "inline-block",
              background: "#e6f7ff",
              borderRadius: 4,
              padding: "2px 8px",
              marginRight: 6,
              marginBottom: 2,
              fontSize: 13,
            }}
          >
            {val}
          </span>
        ))
      )}
    </div>
  );

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
      maxTagCount={5} // 最多只显示5个，超出显示“+N...”
      maxTagPlaceholder={omittedValues =>
        `+${omittedValues.length}...`
      }
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
      maxTagCount={5} // 最多只显示5个，超出显示“+N...”
      maxTagPlaceholder={omittedValues =>
        `+${omittedValues.length}...`
      }
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
  title="选择Book"
  open={bookModalOpen}
  width={700}
  bodyStyle={{ minHeight: 500 }}
  onCancel={() => {
    setBookModalOpen(false);
    setBookModalSelected([]);
    setBookSearchVal("");
    setBookSearchResult([]);
    setBookSearched(false);
    setBookPage(1);
    setBookPageSize(5);
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
  {renderSelectedBooks()}
  <Input.Search
    placeholder="输入关键字后点击搜索"
    value={bookSearchVal}
    onChange={e => setBookSearchVal(e.target.value)}
    onSearch={handleBookModalSearch}
    enterButton="Search"
    style={{ marginBottom: 12, width: 400 }}
  />
  <Table
    rowSelection={{
      selections: [
        {
          key: "all",
          text: "全选全部",
          onSelect: () => setBookModalSelected(bookSearchResult.map(item => item.value)),
        },
        Table.SELECTION_INVERT,
        Table.SELECTION_NONE
      ],
      type: "checkbox",
      selectedRowKeys: bookModalSelected,
      onChange: (selectedRowKeys) => {
        setBookModalSelected(selectedRowKeys);
      },
      getCheckboxProps: record => ({
        disabled: false,
      }),
      preserveSelectedRowKeys: true,
    }}
    columns={[
      { title: "Book", dataIndex: "value", key: "value" }
    ]}
    dataSource={pagedBookSearchResult}
    rowKey="value"
    pagination={{
      current: bookPage,
      pageSize: bookPageSize,
      total: bookSearchResult.length,
      onChange: (page, pageSize) => {
        setBookPage(page);
        setBookPageSize(pageSize);
      },
      showSizeChanger: true,
      pageSizeOptions: ["5", "10", "50", "100"],
      showTotal: (total) => `共 ${total} 条`,
    }}
    size="small"
    scroll={{ y: 320 }}
  />
</Modal>
        {/* Metrics 弹窗 */}
        <Modal
  title="选择Metrics"
  open={metricsModalOpen}
  width={700}
  bodyStyle={{ minHeight: 500 }}
  onCancel={() => {
    setMetricsModalOpen(false);
    setMetricsModalSelected([]);
    setMetricsSearchVal("");
    setMetricsSearchResult([]);
    setMetricsSearched(false);
    setMetricsPage(1);
    setMetricsPageSize(5);
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
  {renderSelectedMetrics()}
  <Input.Search
    placeholder="输入关键字后点击搜索"
    value={metricsSearchVal}
    onChange={e => setMetricsSearchVal(e.target.value)}
    onSearch={handleMetricsModalSearch}
    enterButton="Search"
    style={{ marginBottom: 12, width: 400 }}
  />
  <Table
    rowSelection={{
      selections: [
        {
          key: "all",
          text: "全选全部",
          onSelect: () => setMetricsModalSelected(metricsSearchResult.map(item => item.value)),
        },
        Table.SELECTION_INVERT,
        Table.SELECTION_NONE
      ],
      type: "checkbox",
      selectedRowKeys: metricsModalSelected,
      onChange: (selectedRowKeys) => {
        setMetricsModalSelected(selectedRowKeys);
      },
      getCheckboxProps: record => ({
        disabled: false,
      }),
      preserveSelectedRowKeys: true,
    }}
    columns={[
      { title: "Metric", dataIndex: "value", key: "value" }
    ]}
    dataSource={pagedMetricsSearchResult}
    rowKey="value"
    pagination={{
      current: metricsPage,
      pageSize: metricsPageSize,
      total: metricsSearchResult.length,
      onChange: (page, pageSize) => {
        setMetricsPage(page);
        setMetricsPageSize(pageSize);
      },
      showSizeChanger: true,
      pageSizeOptions: ["5", "10", "50", "100"],
      showTotal: (total) => `共 ${total} 条`,
    }}
    size="small"
    scroll={{ y: 320 }}
  />
</Modal>
        <Divider orientation="left">Query</Divider>
        <Input.TextArea
          value={queryText}
          onChange={handleQueryTextChange}
          rows={8}
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
          <Button style={{ marginLeft: 8 }} onClick={handleExport}>
            Export
          </Button>
        </div>
        {/* Confirm Modal */}
        <Modal
          title="Confirm Query"
          open={confirmVisible}
          onOk={handleConfirmOk}
          onCancel={handleConfirmCancel}
          okText="Confirm"
          cancelText="Cancel"
        >
          <div style={{
            fontFamily: "monospace",
            background: "#f7f7f7",
            borderRadius: 4,
            padding: 12,
            whiteSpace: "pre-wrap"
          }}>
            {queryText}
          </div>
          <div style={{ marginTop: 12, color: "#888" }}>
            Please confirm if the query above is correct.
          </div>
        </Modal>
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