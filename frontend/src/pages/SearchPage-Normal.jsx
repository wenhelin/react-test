import React, { useState, useEffect } from 'react';
import { Input, DatePicker, Select, Card, Button, message, Form } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const minDate = dayjs('1997-01-01');
const maxDate = dayjs('2099-01-01');

// Parse multi-line query, support multi-select service, and validate date range
function parseQuery(query) {
    const lines = query.split('\n').map(line => line.trim()).filter(Boolean);
    let timeRange = [];
    let searchText = '';
    let level = '';
    let service = [];
    let custom = '';
    let dateError = null;
    lines.forEach(line => {
        let m;
        if ((m = line.match(/date\s*>=\s*"([^"]+)"/))) {
            const d = dayjs(m[1]);
            if (!d.isValid() || d.isBefore(minDate) || d.isAfter(maxDate)) {
                dateError = `Start date must be between ${minDate.format('YYYY-MM-DD')} and ${maxDate.format('YYYY-MM-DD')}`;
            } else {
                timeRange[0] = d;
            }
        }
        if ((m = line.match(/date\s*<=\s*"([^"]+)"/))) {
            const d = dayjs(m[1]);
            if (!d.isValid() || d.isBefore(minDate) || d.isAfter(maxDate)) {
                dateError = `End date must be between ${minDate.format('YYYY-MM-DD')} and ${maxDate.format('YYYY-MM-DD')}`;
            } else {
                timeRange[1] = d;
            }
        }
        if ((m = line.match(/text\s*CONTAINS\s*"([^"]+)"/))) {
            searchText = m[1];
        }
        if ((m = line.match(/level\s*=\s*"([^"]+)"/))) {
            level = m[1];
        }
        if ((m = line.match(/service\s*IN\s*\(([^)]+)\)/))) {
            service = m[1]
                .split(',')
                .map(s => s.trim().replace(/^"|"$/g, ''))
                .filter(Boolean);
        } else if ((m = line.match(/service\s*=\s*"([^"]+)"/))) {
            service = [m[1]];
        }
        // Other custom conditions
        if (
            !line.match(/^(date\s*[<>]=?|text\s*CONTAINS|level\s*=|service\s*(IN|=))/)
            && line.length > 0
        ) {
            custom += (custom ? '\n' : '') + line;
        }
    });
    return { timeRange, searchText, level, service, custom, dateError };
}

// Build multi-line query, support multi-select service and custom conditions
function buildQuery({ timeRange, searchText, level, service, custom }) {
    let q = [];
    if (timeRange.length === 2 && timeRange[0] && timeRange[1]) {
        q.push(`date >= "${timeRange[0].format('YYYY-MM-DD')}"`);
        q.push(`date <= "${timeRange[1].format('YYYY-MM-DD')}"`);
    }
    if (searchText) q.push(`text CONTAINS "${searchText}"`);
    if (level) q.push(`level = "${level}"`);
    if (service && service.length > 1) {
        q.push(`service IN (${service.map(s => `"${s}"`).join(',')})`);
    } else if (service && service.length === 1) {
        q.push(`service = "${service[0]}"`);
    }
    if (custom) q.push(custom);
    return q.join('\n');
}

// Only keep valid conditions
function filterValidQuery(query) {
    const parsed = parseQuery(query);
    return buildQuery(parsed);
}

// Simulate API request, return html content
async function fetchLogs(query) {
    if (query.includes('cat')) {
        return `<img src="https://placekitten.com/400/200" alt="cat" style="max-width:100%;" />`;
    }
    return `<div style="padding:20px;font-size:18px;">Result Example:<br/>${query.replace(/\n/g, '<br/>')}</div>`;
}

const LogSearch = () => {
    const [form] = Form.useForm();
    const [query, setQuery] = useState('');
    const [iframeContent, setIframeContent] = useState('');

    // 联动表单内容生成 query
    const onValuesChange = (_, values) => {
        setQuery(buildQuery(values));
    };

    // query 框变化时只更新 query，不联动控件
    const onQueryChange = (e) => {
        setQuery(e.target.value);
    };

    // 查询按钮：过滤不规则信息，只保留合法条件，并展示接口返回的html
    const onFinish = async (values) => {
        const filtered = filterValidQuery(query);
        const parsed = parseQuery(filtered);

        // 校验必填
        if (!parsed.timeRange[0] || !parsed.timeRange[1]) {
            message.error('Date range is required.');
            return;
        }
        if (!parsed.service || parsed.service.length === 0) {
            message.error('Service is required.');
            return;
        }
        if (parsed.dateError) {
            message.error(parsed.dateError);
            return;
        }

        // 同步表单
        form.setFieldsValue({
            ...values,
            timeRange: parsed.timeRange,
            searchText: parsed.searchText,
            level: parsed.level,
            service: parsed.service,
            custom: parsed.custom,
        });
        setQuery(filtered);

        // 调用接口获取html内容
        const html = await fetchLogs(filtered);
        setIframeContent(html);

        message.success('Query:\n' + filtered);
    };

    const disabledDate = (current) => {
        return (
            current && (current < minDate.startOf('day') || current > maxDate.endOf('day'))
        );
    };

    return (
        <Card title="Log Search" style={{ maxWidth: 900, margin: '40px auto' }}>
            <Form
    form={form}
    layout="horizontal"
    labelCol={{ flex: '120px' }}
    wrapperCol={{ flex: '1' }}
    style={{ width: '100%' }}
    onValuesChange={onValuesChange}
    onFinish={onFinish}
    initialValues={{
        timeRange: [],
        searchText: '',
        level: '',
        service: [],
        custom: '',
    }}
>
    <Form.Item
        label="Date Range"
        name="timeRange"
        rules={[{ required: true, message: 'Date range is required' }]}
        htmlFor="date-range"
    >
        <RangePicker
            style={{ width: 260 }}
            disabledDate={disabledDate}
            format="YYYY-MM-DD"
            allowClear
            id="date-range"
        />
    </Form.Item>
    <Form.Item
        label="Log Level"
        name="level"
        htmlFor="log-level"
    >
        <Select
            placeholder="Select level"
            style={{ width: 120 }}
            allowClear
            id="log-level"
        >
            <Option value="INFO">INFO</Option>
            <Option value="WARN">WARN</Option>
            <Option value="ERROR">ERROR</Option>
        </Select>
    </Form.Item>
    <Form.Item
        label="Service"
        name="service"
        rules={[{ required: true, message: 'Service is required' }]}
        htmlFor="service"
    >
        <Select
            mode="multiple"
            placeholder="Select service"
            style={{ width: 200 }}
            allowClear
            id="service"
        >
            <Option value="auth">auth</Option>
            <Option value="order">order</Option>
            <Option value="user">user</Option>
        </Select>
    </Form.Item>
    <Form.Item
        label="Search Text"
        name="searchText"
        htmlFor="search-text"
        style={{ width: '100%' }}
    >
        <Input
                        placeholder="Search logs"
                        allowClear
                        style={{ width: 400 }}
                        id="search-text"
                    />
    </Form.Item>
    {/* <Form.Item
        label="Custom Conditions"
        name="custom"
        htmlFor="custom-conditions"
        style={{ width: '100%' }}
    >
        <Input.TextArea
            placeholder='Enter more custom conditions, e.g. user="Tom"\nstatus="active"'
            rows={3}
            style={{ width: '100%', minHeight: 60, fontSize: 16 }}
            id="custom-conditions"
        />
    </Form.Item> */}
    {/* <Form.Item label="Query" style={{ width: '100%' }}>
        <Input.TextArea
            value={query}
            rows={3}
            onChange={onQueryChange}
            style={{ fontFamily: 'monospace', marginTop: 8 }}
            id="query"
        />
    </Form.Item> */}
    <Form.Item label="Query" style={{ width: '100%' }}>
        <Input.TextArea
            value={query}
            rows={6}
            onChange={onQueryChange}
            style={{ fontFamily: 'monospace', marginTop: 8 }}
            id="query"
            placeholder='You can add more custom conditions here, e.g. user="Tom"\nstatus="active"'
        />
    </Form.Item>
    <Form.Item>
        <Button type="primary" htmlType="submit">Search</Button>
    </Form.Item>
    <Form.Item label="Result" style={{ width: '100%' }}>
        <iframe
            title="result"
            style={{ width: '100%', minHeight: 220, border: '1px solid #eee', marginTop: 8, background: '#fff' }}
            srcDoc={iframeContent}
        />
    </Form.Item>
</Form>
        </Card>
    );
};

export default LogSearch;