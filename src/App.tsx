import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SubscriptionProvider } from './contexts/subscription-context';
import { CurrencyProvider } from './contexts/currency-context';
import { ThemeProvider } from './contexts/theme-context';
import { FilterProvider } from './contexts/filter-context';
import { Header } from './components/ui/header';
import { Sidebar } from './components/ui/sidebar';
import { CompaniesPage } from './pages/companies';
import { SubscribePage } from './pages/subscribe';
import { ScatterChartPage } from './pages/scatter-chart';
import { FilterPage } from './pages/filter';
import { ScoringPage } from './pages/scoring';
import { Hero } from './components/ui/hero';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <SubscriptionProvider>
          <CurrencyProvider>
            <FilterProvider>
              <div className="min-h-screen bg-navy-500">
                <Header />
                <div className="flex">
                  <Sidebar />
                  <main className="flex-1">
                    <Routes>
                      <Route path="/" element={<Hero />} />
                      <Route path="/companies" element={<CompaniesPage />} />
                      <Route path="/scatter-chart" element={<ScatterChartPage />} />
                      <Route path="/subscribe" element={<SubscribePage />} />
                      <Route path="/filter" element={<FilterPage />} />
                      <Route path="/scoring" element={<ScoringPage />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </FilterProvider>
          </CurrencyProvider>
        </SubscriptionProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;