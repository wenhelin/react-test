import React, { useEffect, useState } from 'react';
import OrderList from '../components/OrderList';

const OrdersPage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log(1)
        const fetchOrders = async () => {
            try {
                // Fetch orders from the API
                // Assuming you have an API endpoint set up for this
                const response = await fetch('/api/orders');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                // Handle the response as needed
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <>
        33333
            <h1>Orders</h1>
            <OrderList />
        </>
    );
};

export default OrdersPage;