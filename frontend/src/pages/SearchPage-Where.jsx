import React, { useState } from 'react';
import { Input, DatePicker, Select, Card, Button, message, Form, Space } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 可选字段和操作符
const FIELD_OPTIONS = [
    { label: 'table', value: 'table' },
    { label: 'size', value: 'size' },
    { label: 'user', value: 'user' },
    { label: 'status', value: 'status' },
    // 你可以继续添加更多字段
];
const OPERATOR_OPTIONS = [
    { label: '=', value: '=' },
    { label: '!=', value: '!=' },
    { label: '>', value: '>' },
    { label: '<', value: '<' },
    { label: '>=', value: '>=' },
    { label: '<=', value: '<=' },
    { label: 'IN', value: 'IN' },
    { label: 'LIKE', value: 'LIKE' },
];

const LOGIC_OPTIONS = [
    { label: 'AND', value: 'AND' },
    { label: 'OR', value: 'OR' },
];

// 递归生成SQL-like字符串
function buildConditionString(group) {
    if (!group || !group.conditions || group.conditions.length === 0) return '';
    return '(' + group.conditions.map(cond => {
        if (cond.isGroup) {
            return buildConditionString(cond);
        } else if (cond.field && cond.operator) {
            if (cond.operator === 'IN') {
                return `${cond.field} IN (${cond.value})`;
            } else if (cond.operator === 'LIKE') {
                return `${cond.field} LIKE '%${cond.value}%'`;
            } else {
                return `${cond.field} ${cond.operator} '${cond.value}'`;
            }
        }
        return '';
    }).filter(Boolean).join(` ${group.logic} `) + ')';
}

// 模拟接口请求，返回html内容
async function fetchLogs(query) {
    if (query.includes('cat')) {
        return `<img src="https://placekitten.com/400/200" alt="cat" style="max-width:100%;" />`;
    }
    return `<div style="padding:20px;font-size:18px;">查询结果示例：<br/>${query.replace(/\n/g, '<br/>')}</div>`;
}

// 嵌套条件组件
const ConditionGroup = ({ value = {}, onChange }) => {
    const [logic, setLogic] = useState(value.logic || 'AND');
    const [conditions, setConditions] = useState(value.conditions || []);

    // 更新父组件
    const triggerChange = (changedValue) => {
        if (onChange) {
            onChange({
                logic,
                conditions,
                ...changedValue,
            });
        }
    };

    // 添加新条件
    const addCondition = () => {
        setConditions([...conditions, { field: undefined, operator: '=', value: '', isGroup: false }]);
    };

    // 添加嵌套组
    const addGroup = () => {
        setConditions([...conditions, { isGroup: true, logic: 'AND', conditions: [] }]);
    };

    // 删除条件
    const removeCondition = (idx) => {
        const newConds = conditions.slice();
        newConds.splice(idx, 1);
        setConditions(newConds);
        triggerChange({ conditions: newConds });
    };

    // 修改单个条件
    const updateCondition = (idx, cond) => {
        const newConds = conditions.slice();
        newConds[idx] = cond;
        setConditions(newConds);
        triggerChange({ conditions: newConds });
    };

    // 监听逻辑变更
    const handleLogicChange = (val) => {
        setLogic(val);
        triggerChange({ logic: val });
    };

    // 监听条件变更
    React.useEffect(() => {
        triggerChange({ logic, conditions });
        // eslint-disable-next-line
    }, [logic, conditions]);

    return (
        <div style={{ border: '1px solid #eee', padding: 12, marginBottom: 12, borderRadius: 6, background: '#fafafa' }}>
            <Space align="start" style={{ marginBottom: 8 }}>
                <Select
                    value={logic}
                    onChange={handleLogicChange}
                    options={LOGIC_OPTIONS}
                    style={{ width: 80 }}
                />
                <Button size="small" onClick={addCondition}>+ Condition</Button>
                <Button size="small" onClick={addGroup}>+ Group</Button>
            </Space>
            <div>
                {conditions.map((cond, idx) =>
                    cond.isGroup ? (
                        <div key={idx} style={{ marginLeft: 24, marginBottom: 8 }}>
                            <ConditionGroup
                                value={cond}
                                onChange={val => updateCondition(idx, { ...val, isGroup: true })}
                            />
                            <Button size="small" danger onClick={() => removeCondition(idx)} style={{ marginLeft: 8 }}>Remove Group</Button>
                        </div>
                    ) : (
                        <Space key={idx} align="start" style={{ marginBottom: 8 }}>
                            <Select
                                placeholder="Field"
                                value={cond.field}
                                onChange={val => updateCondition(idx, { ...cond, field: val })}
                                options={FIELD_OPTIONS}
                                style={{ width: 120 }}
                            />
                            <Select
                                placeholder="Operator"
                                value={cond.operator}
                                onChange={val => updateCondition(idx, { ...cond, operator: val })}
                                options={OPERATOR_OPTIONS}
                                style={{ width: 90 }}
                            />
                            <Input
                                placeholder="Value"
                                value={cond.value}
                                onChange={e => updateCondition(idx, { ...cond, value: e.target.value })}
                                style={{ width: 140 }}
                            />
                            <Button size="small" danger onClick={() => removeCondition(idx)}>Remove</Button>
                        </Space>
                    )
                )}
            </div>
        </div>
    );
};

const minDate = dayjs('1997-01-01');
const maxDate = dayjs('2099-01-01');

const LogSearch = () => {
    const [form] = Form.useForm();
    const [query, setQuery] = useState('');
    const [iframeContent, setIframeContent] = useState('');
    const [conditionGroup, setConditionGroup] = useState({ logic: 'AND', conditions: [] });

    // 只用条件编辑器内容渲染到 query
    const handleConditionGroupChange = (group) => {
        setConditionGroup(group);
        const condStr = buildConditionString(group);
        setQuery(condStr && condStr !== '()' ? condStr : '');
    };

    // query 框变化时只更新 query，不联动控件
    const onQueryChange = (e) => {
        setQuery(e.target.value);
    };

    // 查询按钮
    const onFinish = async () => {
        const html = await fetchLogs(query);
        setIframeContent(html);
        message.success('Query:\n' + query);
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
                onFinish={onFinish}
                initialValues={{
                    timeRange: [],
                    searchText: '',
                    level: '',
                    service: [],
                }}
            >
                {/* 你可以保留或移除其他表单项 */}
                <Form.Item label="Advanced Conditions" style={{ width: '100%' }}>
                    <ConditionGroup value={conditionGroup} onChange={handleConditionGroupChange} />
                </Form.Item>
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