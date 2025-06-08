import React, { useEffect, useState } from 'react';
import { Table } from 'antd';
import { $fetchUsers} from '../api/users';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUsers = async () => {
            let response = await $fetchUsers({});
            setUsers(response.result);
            setLoading(false);
            // try {
            //     const data = await fetchUsers();
            //     setUsers(data);
            // } catch (error) {
            //     console.error('Error fetching users:', error);
            // } finally {
            //     setLoading(false);
            // }
        };

        getUsers();
    }, []);

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
    ];

    return (
        <Table
            dataSource={users}
            columns={columns}
            loading={loading}
            rowKey="id"
        />
    );
};

export default UserList;