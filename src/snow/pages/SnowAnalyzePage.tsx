// src/snow/pages/SnowAnalyzePage.tsx
import React, { useState } from 'react';
import { Card, Alert, Spin } from 'antd';
import { useAuth } from '../../context/AuthContext';
import SnowAnalyzeForm from '../components/SnowAnalyzeForm';
import SnowAnalysisResultDisplay from '../components/SnowAnalysisResultDisplay';
import { SnowAnalysisResultFE } from '../types/snow.types';

const SnowAnalyzePage: React.FC = () => {
  const { apiClient, checkPermission } = useAuth();
  const [analysisResult, setAnalysisResult] = useState<SnowAnalysisResultFE | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = async (ticketData: Record<string, any>) => {
    if (!checkPermission('snow:analyze')) {
      setError('You do not have permission to analyze ServiceNow tickets.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await apiClient.analyzeSnowTicket(ticketData);
      setAnalysisResult(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to analyze ticket.';
      setError(errorMsg);
      console.error("SNOW Analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container snow-analyze-page">
      <Card title="ServiceNow Ticket Analyzer" bordered={false}>
        <p className="mb-6 text-secondary-600">
          Input ServiceNow ticket data (in JSON format) to get an AI-powered quality analysis.
        </p>

        {!checkPermission('snow:analyze') && (
          <Alert
            message="Permission Denied"
            description="You do not have permission to use the ServiceNow ticket analyzer. Please contact your administrator."
            type="warning"
            showIcon
            className="mb-6"
          />
        )}

        <SnowAnalyzeForm onSubmit={handleAnalysis} loading={isLoading} disabled={!checkPermission('snow:analyze')} />

        {isLoading && (
          <div className="text-center my-8">
            <Spin size="large" tip="Analyzing ticket..." />
          </div>
        )}

        {error && (
          <Alert message="Analysis Error" description={error} type="error" showIcon className="my-6" />
        )}

        {analysisResult && !isLoading && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-secondary-900 mb-4">Analysis Result</h2>
            <SnowAnalysisResultDisplay result={analysisResult} />
          </div>
        )}
      </Card>
    </div>
  );
};

export default SnowAnalyzePage;