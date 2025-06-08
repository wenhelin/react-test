import React, { useState } from "react";
import {
  Card,
  DatePicker,
  Select,
  Button,
  Form,
  Row,
  Col,
  message,
  Input,
  Grid,
} from "antd";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import "dayjs/locale/en";

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

const { RangePicker } = DatePicker;
const { Option } = Select;
const { useBreakpoint } = Grid;

// 日期范围限制
const MIN_DATE = dayjs("1000-01-01");
const MAX_DATE = dayjs("2400-01-01");

// Calculate workdays (Monday to Friday)
const getWorkdays = (start, end) => {
  if (!start || !end) return 0;
  let count = 0;
  let current = dayjs(start).startOf("day");
  const last = dayjs(end).startOf("day");
  while (current.isSameOrBefore(last)) {
    const day = current.day();
    if (day >= 1 && day <= 5) count++;
    current = current.add(1, "day");
  }
  return count;
};

// Simulate API
const fetchIframe1 = async (params) => {
  return `<div style="padding:20px;font-size:18px;">Iframe 1 Result<br/>Workdays: ${params.workdays}</div>`;
};
const fetchIframe2 = async (params) => {
  return `<div style="padding:20px;font-size:18px;">Iframe 2 Result<br/>Type: ${params.type}</div>`;
};

const DATA_POPULATION_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Partial", value: "partial" },
  { label: "None", value: "none" },
];
const TYPE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "SpearmanCorrelation", value: "SpearmanCorrelation" },
  { label: "KSDistance", value: "KSDistance" },
];

const DeskHeatmap = () => {
  const [form] = Form.useForm();
  const [workdays, setWorkdays] = useState(0);
  const [iframe1, setIframe1] = useState("");
  const [iframe2, setIframe2] = useState("");
  const [type, setType] = useState("all");
  const screens = useBreakpoint();

  // 日期选择限制
  const disabledDate = (current) => {
    return (
      current &&
      (current < MIN_DATE.startOf("day") || current > MAX_DATE.endOf("day"))
    );
  };

  // 只计算工作日，不操作iframe
  const onValuesChange = (_, values) => {
    const { dateRange, type: typeValue } = values;
    if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      const days = getWorkdays(dateRange[0], dateRange[1]);
      setWorkdays(days);
    } else {
      setWorkdays(0);
    }
    if (typeValue) setType(typeValue);
  };

  // Search按钮：查接口并渲染iframe
  const handleSearch = async () => {
    const values = form.getFieldsValue();
    if (!values.dateRange || values.dateRange.length !== 2) {
      message.error("Please select a date range.");
      setIframe1("");
      setIframe2("");
      return;
    }
    if (!values.dataPopulation || !values.type) {
      message.error("Please select DataPopulation and Type.");
      setIframe1("");
      setIframe2("");
      return;
    }
    const params = {
      dateRange: values.dateRange,
      workdays,
      dataPopulation: values.dataPopulation,
      type: values.type,
    };
    let html1 = "";
    let html2 = "";
    if (values.type === "all") {
      [html1, html2] = await Promise.all([
        fetchIframe1(params),
        fetchIframe2(params),
      ]);
    } else if (values.type === "SpearmanCorrelation") {
      html1 = await fetchIframe1(params);
      html2 = "";
    } else if (values.type === "KSDistance") {
      html1 = "";
      html2 = await fetchIframe2(params);
    }
    setIframe1(html1);
    setIframe2(html2);
    message.success("Search finished!");
  };

  // Download button
  const handleDownload = () => {
    message.info("Download triggered!");
  };

  // 响应式布局：小于1280宽度上下，大于等于1280宽度左右
  const isVertical = !screens.xl;

  return (
    <Card title="Export Data" style={{ maxWidth: 900, margin: "40px auto" }}>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={onValuesChange}
        initialValues={{
          dataPopulation: undefined,
          type: "all",
        }}
      >
        <Row gutter={16} align="middle">
          <Col>
            <Form.Item
              label="Date Range"
              name="dateRange"
              rules={[{ required: true, message: "Please select date range" }]}
            >
              <RangePicker
                style={{ width: 260 }}
                disabledDate={disabledDate}
              />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item label="Workdays">
              <Input
                value={workdays}
                readOnly
                style={{
                  width: 100,
                  background: "#f5f5f5",
                  textAlign: "center",
                }}
              />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item
              label="DataPopulation"
              name="dataPopulation"
              rules={[
                { required: true, message: "Please select DataPopulation" },
              ]}
            >
              <Select placeholder="Select" style={{ width: 140 }}>
                {DATA_POPULATION_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col>
            <Form.Item
              label="Type"
              name="type"
              rules={[{ required: true, message: "Please select Type" }]}
              initialValue="all"
            >
              <Select
                placeholder="Select"
                style={{ width: 180 }}
                onChange={val => setType(val)}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Button
              type="primary"
              onClick={handleSearch}
              style={{ marginRight: 8 }}
            >
              Search
            </Button>
            <Button onClick={handleDownload}>Download</Button>
          </Col>
        </Row>
        {/* 响应式iframe区域 */}
        <Row gutter={16} style={isVertical ? { flexDirection: "column" } : {}}>
          <Col span={isVertical ? 24 : 12} style={isVertical ? { marginBottom: 16 } : {}}>
            <div
              style={{
                border: "1px solid #eee",
                minHeight: 220,
                background: "#fff",
              }}
            >
              {/* 只在点击Search后渲染iframe内容 */}
              {iframe1 && (type === "all" || type === "SpearmanCorrelation") ? (
                <iframe
                  title="iframe1"
                  style={{ width: "100%", minHeight: 220, border: "none" }}
                  srcDoc={iframe1}
                />
              ) : null}
            </div>
          </Col>
          <Col span={isVertical ? 24 : 12}>
            <div
              style={{
                border: "1px solid #eee",
                minHeight: 220,
                background: "#fff",
              }}
            >
              {iframe2 && (type === "all" || type === "KSDistance") ? (
                <iframe
                  title="iframe2"
                  style={{ width: "100%", minHeight: 220, border: "none" }}
                  srcDoc={iframe2}
                />
              ) : null}
            </div>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default DeskHeatmap;