import React, { useState, useEffect } from 'react';
import { Input, DatePicker, Select, Card, Space, Button, message } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

function parseQuery(query) {
    // 简单解析，实际可根据你的query语法扩展
    const timeMatch = query.match(/timestamp\s*>=\s*"([^"]+)"\s*AND\s*timestamp\s*<=\s*"([^"]+)"/);
    const textMatch = query.match(/text\s*CONTAINS\s*"([^"]+)"/);
    const levelMatch = query.match(/level\s*=\s*"([^"]+)"/);
    const serviceMatch = query.match(/service\s*=\s*"([^"]+)"/);

    return {
        timeRange: timeMatch ? [dayjs(timeMatch[1]), dayjs(timeMatch[2])] : [],
        searchText: textMatch ? textMatch[1] : '',
        level: levelMatch ? levelMatch[1] : '',
        service: serviceMatch ? serviceMatch[1] : ''
    };
}

const LogSearch = () => {
    const [timeRange, setTimeRange] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [level, setLevel] = useState('');
    const [service, setService] = useState('');
    const [query, setQuery] = useState('');

    // 由控件生成 query
    useEffect(() => {
        let q = [];
        if (timeRange.length === 2) {
            q.push(`timestamp >= "${timeRange[0].format('YYYY-MM-DD HH:mm:ss')}" AND timestamp <= "${timeRange[1].format('YYYY-MM-DD HH:mm:ss')}"`);
        }
        if (searchText) q.push(`text CONTAINS "${searchText}"`);
        if (level) q.push(`level = "${level}"`);
        if (service) q.push(`service = "${service}"`);
        setQuery(q.join(' AND '));
        // eslint-disable-next-line
    }, [timeRange, searchText, level, service]);

    // 由 query 框反向联动控件
    const onQueryChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        const parsed = parseQuery(val);
        setTimeRange(parsed.timeRange);
        setSearchText(parsed.searchText);
        setLevel(parsed.level);
        setService(parsed.service);
    };

    const onSearch = () => {
        message.success('查询语句: ' + query);
        // 这里可以发请求
        // fetchLogs(query)
    };

    return (
        <Card title="Log Search" style={{ maxWidth: 800, margin: '40px auto' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Space>
                    <RangePicker
                        showTime
                        value={timeRange}
                        onChange={setTimeRange}
                        style={{ width: 320 }}
                    />
                    <Select
                        placeholder="Level"
                        style={{ width: 120 }}
                        allowClear
                        value={level || undefined}
                        onChange={setLevel}
                    >
                        <Option value="INFO">INFO</Option>
                        <Option value="WARN">WARN</Option>
                        <Option value="ERROR">ERROR</Option>
                    </Select>
                    <Select
                        placeholder="Service"
                        style={{ width: 160 }}
                        allowClear
                        value={service || undefined}
                        onChange={setService}
                    >
                        <Option value="auth">auth</Option>
                        <Option value="order">order</Option>
                        <Option value="user">user</Option>
                    </Select>
                </Space>
                <Input.Search
                    placeholder="Search logs"
                    allowClear
                    enterButton
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    style={{ width: 500 }}
                />
                <Input.TextArea
                    value={query}
                    rows={3}
                    onChange={onQueryChange}
                    style={{ fontFamily: 'monospace' }}
                />
                <Button type="primary" onClick={onSearch}>查询</Button>
            </Space>
        </Card>
    );
};

export default LogSearch;