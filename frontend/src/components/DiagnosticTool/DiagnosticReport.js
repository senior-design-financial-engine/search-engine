import React, { useState, useEffect } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { 
  checkApiHealth, 
  getApiErrorLogs, 
  getFullDiagnosticReport 
} from '../../services/api';

const DiagnosticReport = () => {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get basic API health
      const healthStatus = await checkApiHealth();
      
      // Get frontend error logs
      const errorLogs = getApiErrorLogs();
      
      // Get environment info
      const envInfo = {
        apiUrl: process.env.REACT_APP_API_URL || 'Not configured',
        environment: process.env.REACT_APP_ENV || 'development'
      };
      
      // Get network info
      const networkInfo = {
        online: navigator.onLine,
        userAgent: navigator.userAgent,
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
        } : null
      };
      
      // Try to get advanced diagnostics from backend
      let advancedDiagnostics = null;
      try {
        advancedDiagnostics = await getFullDiagnosticReport();
      } catch (e) {
        console.warn('Could not fetch advanced diagnostics:', e);
      }
      
      // Generate the report text
      const reportText = formatLLMReport(
        healthStatus, 
        errorLogs, 
        envInfo, 
        networkInfo, 
        advancedDiagnostics
      );
      
      setReport(reportText);
    } catch (err) {
      setError(err.message || 'Failed to generate diagnostic report');
      console.error('Report generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatLLMReport = (health, errorLogs, envInfo, networkInfo, advancedData) => {
    const timestamp = new Date().toISOString();
    
    let report = `### Diagnostic Report (${timestamp})\n\n`;
    
    // Add API status
    report += `#### API Status\n`;
    if (health) {
      report += `Status: ${health.status || 'unknown'}\n`;
      if (health.error) report += `Error: ${health.error}\n`;
    } else {
      report += `Status: unknown\n`;
    }
    report += '\n';
    
    // Add environment info
    report += `#### Environment Info\n`;
    report += `API URL: ${envInfo.apiUrl}\n`;
    report += `Environment: ${envInfo.environment}\n`;
    report += `Browser: ${networkInfo.userAgent}\n`;
    report += `Online: ${networkInfo.online ? 'Yes' : 'No'}\n`;
    if (networkInfo.connection) {
      report += `Network type: ${networkInfo.connection.effectiveType || 'Unknown'}\n`;
      if (networkInfo.connection.downlink) {
        report += `Downlink: ${networkInfo.connection.downlink} Mbps\n`;
      }
      if (networkInfo.connection.rtt) {
        report += `RTT: ${networkInfo.connection.rtt} ms\n`;
      }
    }
    report += '\n';
    
    // Add error logs (limit to most recent 10)
    report += `#### Error Logs (${errorLogs.length} total)\n`;
    
    if (errorLogs.length === 0) {
      report += 'No errors logged\n';
    } else {
      const recentLogs = errorLogs.slice(-10);
      
      recentLogs.forEach((log, index) => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        report += `[${timestamp}] ${log.message}\n`;
        if (log.error?.message) report += `Error: ${log.error.message}\n`;
        if (log.error?.status) report += `Status: ${log.error.status}\n`;
        if (log.error?.url) report += `URL: ${log.error.url}\n`;
        if (index < recentLogs.length - 1) report += '\n';
      });
    }
    
    // Add advanced diagnostics if available
    if (advancedData) {
      report += '\n#### Advanced Diagnostics\n';
      
      // System info
      if (advancedData.system) {
        report += `Hostname: ${advancedData.system.hostname}\n`;
        report += `Platform: ${advancedData.system.platform} ${advancedData.system.platform_version}\n`;
        
        if (advancedData.system.cpu) {
          report += `CPU Usage: ${advancedData.system.cpu.percent}%\n`;
        }
        
        if (advancedData.system.memory) {
          report += `Memory Usage: ${advancedData.system.memory.percent_used}%\n`;
        }
      }
      
      // Elasticsearch status
      if (advancedData.elasticsearch) {
        report += `Elasticsearch Connected: ${advancedData.elasticsearch.success ? 'Yes' : 'No'}\n`;
        if (!advancedData.elasticsearch.success && advancedData.elasticsearch.error) {
          report += `Elasticsearch Error: ${advancedData.elasticsearch.error}\n`;
        }
      }
      
      // Recent errors from backend
      if (advancedData.recent_errors && advancedData.recent_errors.length > 0) {
        report += `\nBackend Errors: ${advancedData.recent_errors.length} recent errors\n`;
        advancedData.recent_errors.slice(0, 3).forEach((error, index) => {
          const errorMessage = error.message || error.raw || 'Unknown error';
          report += `  ${index + 1}. ${errorMessage}\n`;
        });
      }
    }
    
    return report;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report)
      .then(() => {
        alert('Diagnostic report copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy report:', err);
        alert('Failed to copy report. Please try manually selecting and copying the text.');
      });
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" role="status" />
        <p className="mt-2">Generating diagnostic report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Report Generation Failed</Alert.Heading>
        <p>{error}</p>
        <div className="d-flex justify-content-end">
          <Button variant="outline-danger" onClick={generateReport}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="p-3">
      <Alert variant="info" className="mb-3">
        <Alert.Heading>LLM-Friendly Diagnostic Report</Alert.Heading>
        <p>
          This format is optimized for sharing with AI assistants. 
          It contains all relevant troubleshooting information in a compact format.
        </p>
        <div className="d-grid gap-2 d-md-flex justify-content-md-end">
          <Button 
            variant="primary" 
            onClick={copyToClipboard}
          >
            <i className="bi bi-clipboard me-1"></i> Copy Report
          </Button>
          <Button 
            variant="outline-secondary" 
            onClick={generateReport}
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh Data
          </Button>
        </div>
      </Alert>
      
      <div className="bg-light p-3 border rounded monospace">
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {report}
        </pre>
      </div>
    </div>
  );
};

export default DiagnosticReport; 