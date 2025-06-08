import React, { useEffect, useState } from 'react';
import UserList from '../components/UserList';

const UsersPage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch user data here if needed
                // Example: await fetchUsers();
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div>
            <h1>User List</h1>
            <UserList />
        </div>
    );
};

export default UsersPage;