import React, { useState, useEffect } from 'react';
import { Input, DatePicker, Select, Card, Space, Button, message } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 解析多行 query，支持多选 service
function parseQuery(query) {
    const lines = query.split('\n').map(line => line.trim()).filter(Boolean);
    let timeRange = [];
    let searchText = '';
    let level = '';
    let service = [];
    lines.forEach(line => {
        let m;
        if ((m = line.match(/timestamp\s*>=\s*"([^"]+)"/))) {
            timeRange[0] = dayjs(m[1]);
        }
        if ((m = line.match(/timestamp\s*<=\s*"([^"]+)"/))) {
            timeRange[1] = dayjs(m[1]);
        }
        if ((m = line.match(/text\s*CONTAINS\s*"([^"]+)"/))) {
            searchText = m[1];
        }
        if ((m = line.match(/level\s*=\s*"([^"]+)"/))) {
            level = m[1];
        }
        if ((m = line.match(/service\s*IN\s*\(([^)]+)\)/))) {
            // 匹配 service IN ("auth","order")
            service = m[1]
                .split(',')
                .map(s => s.trim().replace(/^"|"$/g, ''))
                .filter(Boolean);
        } else if ((m = line.match(/service\s*=\s*"([^"]+)"/))) {
            // 兼容单选
            service = [m[1]];
        }
    });
    return { timeRange, searchText, level, service };
}

// 生成多行 query，支持多选 service
function buildQuery({ timeRange, searchText, level, service }) {
    let q = [];
    if (timeRange.length === 2 && timeRange[0] && timeRange[1]) {
        q.push(`timestamp >= "${timeRange[0].format('YYYY-MM-DD HH:mm:ss')}"`);
        q.push(`timestamp <= "${timeRange[1].format('YYYY-MM-DD HH:mm:ss')}"`);
    }
    if (searchText) q.push(`text CONTAINS "${searchText}"`);
    if (level) q.push(`level = "${level}"`);
    if (service && service.length > 1) {
        q.push(`service IN (${service.map(s => `"${s}"`).join(',')})`);
    } else if (service && service.length === 1) {
        q.push(`service = "${service[0]}"`);
    }
    return q.join('\n');
}

// 过滤并只保留合法条件
function filterValidQuery(query) {
    const parsed = parseQuery(query);
    return buildQuery(parsed);
}

// 模拟接口请求，返回html内容
async function fetchLogs(query) {
    // 这里你可以替换为真实接口请求
    // 例如：const res = await axios.post('/api/logs', { query });
    // return res.data.html;
    if (query.includes('cat')) {
        return `<img src="https://placekitten.com/400/200" alt="cat" style="max-width:100%;" />`;
    }
    return `<div style="padding:20px;font-size:18px;">查询结果示例：<br/>${query.replace(/\n/g, '<br/>')}</div>`;
}

const LogSearch = () => {
    const [timeRange, setTimeRange] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [level, setLevel] = useState('');
    const [service, setService] = useState([]);
    const [query, setQuery] = useState('');
    const [iframeContent, setIframeContent] = useState('');

    // 控件变化时生成多行 query
    useEffect(() => {
        setQuery(buildQuery({ timeRange, searchText, level, service }));
        // eslint-disable-next-line
    }, [timeRange, searchText, level, service]);

    // query 框变化时只更新 query，不联动控件
    const onQueryChange = (e) => {
        setQuery(e.target.value);
    };

    // 查询按钮：过滤不规则信息，只保留合法条件，并展示接口返回的html
    const onSearch = async () => {
        const filtered = filterValidQuery(query);
        const parsed = parseQuery(filtered);
        setTimeRange(parsed.timeRange);
        setSearchText(parsed.searchText);
        setLevel(parsed.level);
        setService(parsed.service);
        setQuery(filtered);

        // 调用接口获取html内容
        const html = await fetchLogs(filtered);
        setIframeContent(html);

        message.success('查询语句:\n' + filtered);
    };

    return (
        <Card title="Log Search" style={{ maxWidth: 800, margin: '40px auto' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <label style={{ fontWeight: 600 }}>时间范围：</label>
                    <RangePicker
                        showTime
                        value={timeRange}
                        onChange={setTimeRange}
                        style={{ width: 320, marginLeft: 8 }}
                    />
                </div>
                <div>
                    <label style={{ fontWeight: 600 }}>日志级别：</label>
                    <Select
                        placeholder="Level"
                        style={{ width: 120, marginLeft: 8 }}
                        allowClear
                        value={level || undefined}
                        onChange={setLevel}
                    >
                        <Option value="INFO">INFO</Option>
                        <Option value="WARN">WARN</Option>
                        <Option value="ERROR">ERROR</Option>
                    </Select>
                </div>
                <div>
                    <label style={{ fontWeight: 600 }}>服务类型：</label>
                    <Select
                        mode="multiple"
                        placeholder="Service"
                        style={{ width: 240, marginLeft: 8 }}
                        allowClear
                        value={service}
                        onChange={setService}
                    >
                        <Option value="auth">auth</Option>
                        <Option value="order">order</Option>
                        <Option value="user">user</Option>
                    </Select>
                </div>
                <div>
                    <label style={{ fontWeight: 600 }}>搜索内容：</label>
                    <Input.Search
                        placeholder="Search logs"
                        allowClear
                        enterButton
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 500, marginLeft: 8 }}
                    />
                </div>
                <div>
                    <label style={{ fontWeight: 600 }}>Query 语句：</label>
                    <Input.TextArea
                        value={query}
                        rows={5}
                        onChange={onQueryChange}
                        style={{ fontFamily: 'monospace', marginTop: 8 }}
                    />
                </div>
                <Button type="primary" onClick={onSearch}>查询</Button>
                <div style={{ marginTop: 24 }}>
                    <label style={{ fontWeight: 600 }}>查询结果：</label>
                    <iframe
                        title="result"
                        style={{ width: '100%', minHeight: 220, border: '1px solid #eee', marginTop: 8, background: '#fff' }}
                        srcDoc={iframeContent}
                    />
                </div>
            </Space>
        </Card>
    );
};

export default LogSearch;