import React from 'react';
import {  Route, Routes } from 'react-router-dom';
import OrdersPage from './pages/OrdersPage';
import UsersPage from './pages/UsersPage';
import SearchPage from './pages/SearchPage-Where';
import SearchPageNormal from './pages/SearchPage-Normal'
import SearchPageOther from './pages/SearchPage-Other'
import DeskHeatmap from './pages/DeskHeatmap'
import NewSearch from './pages/NewSearch'; // Uncomment if you want to use the new search page
import DrcMetrics from './pages/DrcMetrics'; // Uncomment if you want to use the DRC metrics page

const App = () => {
    return (
            <Routes>
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/search-where" element={<SearchPage />} />
                <Route path="/search-normal" element={<SearchPageNormal />} />
                <Route path="/search-other" element={<SearchPageOther />} />
                <Route path="/desk-heatmap" element={<DeskHeatmap />} />
                <Route path="/new-search" element={<NewSearch />} /> {/* Uncomment if you want to use the new search page */}
                <Route path="/drc-metrics" element={<DrcMetrics />} /> {/* Uncomment if you want to use the DRC metrics page */}
            </Routes>
    );
};

export default App;