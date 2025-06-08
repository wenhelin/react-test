import React, { useEffect, useState } from 'react';
import { Table, Spin } from 'antd';
import { $fetchOrders } from '../api/orders';

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            let response = await $fetchOrders({});
            console.log(response.result);
            setOrders(response.result);
            setLoading(false);
            // try {
            //     const response = await axios.get('http://localhost:5000/api/orders');
            //     setOrders(response.data);
            // } catch (error) {
            //     console.error('Error fetching orders:', error);
            // } finally {
            //     setLoading(false);
            // }
        };

        fetchOrders();
    }, []);

    const columns = [
        {
            title: 'Order ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: 'Customer Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Total Amount',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
        },
    ];

    return (
        <div>
            {loading ? (
                <Spin />
            ) : (
                <Table dataSource={orders} columns={columns} rowKey="id" />
            )}
        </div>
    );
};

export default OrderList;