import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Accordion, Badge, Table, Alert, Form, Tabs, Tab, Spinner } from 'react-bootstrap';
import { 
  checkApiHealth, 
  getApiErrorLogs, 
  clearApiErrorLogs,
  getFullDiagnosticReport,
  getDiagnosticNetworkInfo,
  getDiagnosticSystemInfo,
  getDiagnosticElasticsearchInfo,
  getDiagnosticErrorLogs
} from '../services/api';

const DiagnosticTool = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [envInfo, setEnvInfo] = useState({});
  const [connectionTest, setConnectionTest] = useState(null);
  const [networkDiagnostics, setNetworkDiagnostics] = useState(null);
  const [systemDiagnostics, setSystemDiagnostics] = useState(null);
  const [esDiagnostics, setEsDiagnostics] = useState(null);
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [networkInfo, setNetworkInfo] = useState({
    online: navigator.onLine,
    userAgent: navigator.userAgent,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      type: navigator.connection.type,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
    } : null
  });
  const [showCopyableFormat, setShowCopyableFormat] = useState(false);
  const [selectedDiagnosticTab, setSelectedDiagnosticTab] = useState('basic');

  useEffect(() => {
    // Get environment info
    const apiUrl = process.env.REACT_APP_API_URL || 'http://development-backend-alb-708631307.us-east-1.elb.amazonaws.com';
    
    setEnvInfo({
      apiUrl,
      environment: process.env.REACT_APP_ENV || 'development'
    });

    // Load health status and error logs
    loadDiagnosticData();

    // Add online/offline event listeners
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  const handleNetworkChange = () => {
    setNetworkInfo(prev => ({
      ...prev,
      online: navigator.onLine
    }));
    // Recheck health when network changes
    checkHealth();
  };

  const loadDiagnosticData = async () => {
    setLoading(true);
    await checkHealth();
    loadErrorLogs();
    setLoading(false);
  };

  const checkHealth = async () => {
    try {
      const health = await checkApiHealth();
      setHealthStatus(health);
    } catch (error) {
      console.error("Failed to check health:", error);
      setHealthStatus({
        status: 'error',
        error: error.message || 'Connection refused',
        online: navigator.onLine
      });
    }
  };

  const loadErrorLogs = () => {
    const logs = getApiErrorLogs();
    setErrorLogs(logs);
  };

  const handleClearLogs = () => {
    clearApiErrorLogs();
    setErrorLogs([]);
  };

  const testConnection = async () => {
    const apiUrl = envInfo.apiUrl;
    
    setConnectionTest({ status: 'pending', message: `Testing connection to ${apiUrl}...` });
    try {
      // Try to fetch the API root
      const response = await fetch(apiUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setConnectionTest({
          status: 'success',
          message: 'Connection successful',
          details: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries([...response.headers.entries()])
          }
        });
      } else {
        setConnectionTest({
          status: 'warning',
          message: `Connection reached server but returned status ${response.status}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries([...response.headers.entries()])
          }
        });
      }
    } catch (error) {
      setConnectionTest({
        status: 'error',
        message: 'Connection failed',
        error: error.message || 'Unknown error'
      });
      
      // Add information about potential fixes
      if (error.message?.includes('ERR_CONNECTION_REFUSED')) {
        setConnectionTest(prev => ({
          ...prev,
          possibleFixes: [
            'Check if the backend server is running',
            'Check if there are firewall or networking issues',
            'Verify the API URL is correct and accessible from your network'
          ]
        }));
      }
    }
  };

  // Make API call to the new diagnostic endpoints
  const fetchAdvancedDiagnostics = async (type) => {
    setLoadingDiagnostics(true);
    try {
      let data;
      
      switch(type) {
        case 'network':
          data = await getDiagnosticNetworkInfo();
          setNetworkDiagnostics(data);
          break;
        case 'system':
          data = await getDiagnosticSystemInfo();
          setSystemDiagnostics(data);
          break;
        case 'elasticsearch':
          data = await getDiagnosticElasticsearchInfo();
          setEsDiagnostics(data);
          break;
        case 'report':
          try {
            data = await getFullDiagnosticReport();
            console.log('Received diagnostic report:', data);
            setDiagnosticReport(data);
          } catch (reportError) {
            console.error('Diagnostic report error:', reportError);
            // Create a more detailed client-side report with error information
            generateClientSideDiagnosticReport(reportError);
          }
          break;
        default:
          // For health, we already have that data
          break;
      }
    } catch (error) {
      console.error(`Failed to fetch ${type} diagnostics:`, error);
      if (type === 'report' && !diagnosticReport) {
        // Generate client-side report only if we haven't already set one in the nested try/catch
        generateClientSideDiagnosticReport(error);
      }
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  // Helper function to generate client-side diagnostic report
  const generateClientSideDiagnosticReport = (error) => {
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorStatus = error?.response?.status;
    
    // Generate a client-side only diagnostic report when backend is unreachable
    const offlineReport = {
      _generated: 'client-side',
      timestamp: new Date().toISOString(),
      status: 'degraded',
      frontend: {
        online: navigator.onLine,
        userAgent: navigator.userAgent,
        window: {
          innerHeight: window.innerHeight,
          innerWidth: window.innerWidth
        },
        connection: networkInfo.connection
      },
      backend: {
        status: 'unreachable',
        error: errorMessage,
        status_code: errorStatus,
        last_attempt: new Date().toISOString()
      },
      // Create safe empty objects that match the expected structure
      system: {},
      elasticsearch: {},
      recent_errors: errorLogs.slice(-5).map(log => ({
        timestamp: log.timestamp,
        level: 'ERROR',
        message: log.message,
        error: log.error
      }))
    };
    
    setDiagnosticReport(offlineReport);
  };

  // Create the copyable diagnostic report in a compact, structured format for LLMs
  const generateLLMReport = () => {
    const timestamp = new Date().toISOString();
    
    let report = `### Diagnostic Report (${timestamp})\n\n`;
    
    // Add API status
    report += `#### API Status\n`;
    if (healthStatus) {
      report += `Status: ${healthStatus.status || 'unknown'}\n`;
      if (healthStatus.error) report += `Error: ${healthStatus.error}\n`;
      if (connectionTest) report += `Connection test: ${connectionTest.message}\n`;
      if (connectionTest?.error) report += `Connection error: ${connectionTest.error}\n`;
      if (connectionTest?.possibleFixes) {
        report += `Possible fixes:\n`;
        connectionTest.possibleFixes.forEach(fix => {
          report += `- ${fix}\n`;
        });
      }
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
    if (diagnosticReport) {
      report += '\n#### Advanced Diagnostics\n';
      
      // Note if this is client-side generated data
      if (diagnosticReport._generated === 'client-side') {
        report += `NOTE: This is client-side generated diagnostic data. Backend is unreachable.\n\n`;
      }
      
      // System info
      if (diagnosticReport.system) {
        report += `Hostname: ${diagnosticReport.system.hostname}\n`;
        report += `Platform: ${diagnosticReport.system.platform} ${diagnosticReport.system.platform_version}\n`;
        
        if (diagnosticReport.system.cpu) {
          report += `CPU Usage: ${diagnosticReport.system.cpu.percent}%\n`;
        }
        
        if (diagnosticReport.system.memory) {
          report += `Memory Usage: ${diagnosticReport.system.memory.percent_used}%\n`;
        }
      }
      
      // Elasticsearch status
      if (diagnosticReport.elasticsearch) {
        report += `Elasticsearch Connected: ${diagnosticReport.elasticsearch.success ? 'Yes' : 'No'}\n`;
        if (!diagnosticReport.elasticsearch.success && diagnosticReport.elasticsearch.error) {
          report += `Elasticsearch Error: ${diagnosticReport.elasticsearch.error}\n`;
        }
      }
      
      // Recent errors from backend
      if (diagnosticReport.recent_errors && diagnosticReport.recent_errors.length > 0) {
        report += `\nBackend Errors: ${diagnosticReport.recent_errors.length} recent errors\n`;
      }
    }
    
    return report;
  };

  const copyToClipboard = () => {
    const report = generateLLMReport();
    navigator.clipboard.writeText(report)
      .then(() => {
        alert('Diagnostic report copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy report:', err);
        alert('Failed to copy report. Please try manually selecting and copying the text.');
      });
  };

  // Run a full diagnostic report that collects data from all diagnostic endpoints
  const runFullDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      await fetchAdvancedDiagnostics('report');
      setSelectedDiagnosticTab('advanced');
    } catch (error) {
      console.error('Failed to run full diagnostics:', error);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  // Render the advanced diagnostics panel
  const renderAdvancedDiagnostics = () => {
    if (loadingDiagnostics) {
      return (
        <div className="text-center p-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading diagnostics...</span>
          </Spinner>
          <p className="mt-2">Loading detailed diagnostics...</p>
        </div>
      );
    }

    if (diagnosticReport) {
      // Handle client-side generated report
      const isClientGenerated = diagnosticReport._generated === 'client-side';
      
      // Safety check for null/undefined properties
      const safeSystem = diagnosticReport.system || {};
      const safeElasticsearch = diagnosticReport.elasticsearch || {};
      const safeErrors = Array.isArray(diagnosticReport.recent_errors) ? diagnosticReport.recent_errors : [];
      
      return (
        <div>
          {isClientGenerated && (
            <Alert variant="warning" className="mb-3">
              <Alert.Heading>Limited Diagnostics Available</Alert.Heading>
              <p>
                Unable to reach the backend server. Showing client-side diagnostics only.
              </p>
              <hr />
              <p className="mb-0">
                Please check your network connection and verify the backend server is running.
              </p>
            </Alert>
          )}
          
          <Alert variant={isClientGenerated ? "warning" : "info"} className="mb-3">
            <Alert.Heading>Diagnostic Report</Alert.Heading>
            <p>
              {isClientGenerated 
                ? "This is a limited diagnostic report with client-side information only."
                : "This is a detailed diagnostic report that includes system, network, and service information from both the frontend and backend."}
            </p>
          </Alert>
          
          <Accordion defaultActiveKey="0" className="mb-3">
            <Accordion.Item eventKey="0">
              <Accordion.Header>System Information</Accordion.Header>
              <Accordion.Body>
                {Object.keys(safeSystem).length > 0 ? (
                  <Table striped bordered>
                    <tbody>
                      <tr>
                        <th>Hostname</th>
                        <td>{safeSystem.hostname || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Platform</th>
                        <td>{safeSystem.platform || 'N/A'} {safeSystem.platform_version || ''}</td>
                      </tr>
                      <tr>
                        <th>CPU Usage</th>
                        <td>{safeSystem.cpu?.percent !== undefined ? `${safeSystem.cpu.percent}%` : 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Memory Usage</th>
                        <td>{safeSystem.memory?.percent_used !== undefined ? `${safeSystem.memory.percent_used}%` : 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Disk Usage</th>
                        <td>{safeSystem.disk?.percent_used !== undefined ? `${safeSystem.disk.percent_used}%` : 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Process Uptime</th>
                        <td>{safeSystem.uptime?.process !== undefined ? `${Math.floor((safeSystem.uptime.process) / 60)} minutes` : 'N/A'}</td>
                      </tr>
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="warning">
                    <p className="mb-0">System information not available. Backend server may be unreachable.</p>
                  </Alert>
                )}
                
                {/* Always show client-side system info */}
                <h5 className="mt-3">Client Information</h5>
                <Table striped bordered>
                  <tbody>
                    <tr>
                      <th>Browser</th>
                      <td>{navigator.userAgent}</td>
                    </tr>
                    <tr>
                      <th>Window Size</th>
                      <td>{window.innerWidth}x{window.innerHeight}</td>
                    </tr>
                    <tr>
                      <th>Network Status</th>
                      <td>{navigator.onLine ? 'Online' : 'Offline'}</td>
                    </tr>
                    {networkInfo.connection && (
                      <>
                        <tr>
                          <th>Connection Type</th>
                          <td>{networkInfo.connection.effectiveType || 'Unknown'}</td>
                        </tr>
                        {networkInfo.connection.downlink && (
                          <tr>
                            <th>Downlink</th>
                            <td>{networkInfo.connection.downlink} Mbps</td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </Table>
              </Accordion.Body>
            </Accordion.Item>
            
            <Accordion.Item eventKey="1">
              <Accordion.Header>Elasticsearch Status</Accordion.Header>
              <Accordion.Body>
                {Object.keys(safeElasticsearch).length > 0 ? (
                  <div>
                    <Alert variant={safeElasticsearch.success ? 'success' : 'danger'}>
                      <Alert.Heading>
                        {safeElasticsearch.success ? 'Connected' : 'Connection Failed'}
                      </Alert.Heading>
                      {!safeElasticsearch.success && safeElasticsearch.error && (
                        <p className="mb-0"><strong>Error:</strong> {safeElasticsearch.error}</p>
                      )}
                    </Alert>
                    
                    {safeElasticsearch.ping && (
                      <div className="mt-3">
                        <h5>Network Ping</h5>
                        <Table striped bordered>
                          <tbody>
                            <tr>
                              <th>Success</th>
                              <td>{safeElasticsearch.ping.success ? 'Yes' : 'No'}</td>
                            </tr>
                            <tr>
                              <th>Packet Loss</th>
                              <td>{safeElasticsearch.ping.packet_loss_percent !== undefined ? `${safeElasticsearch.ping.packet_loss_percent}%` : 'N/A'}</td>
                            </tr>
                            {safeElasticsearch.ping.avg_latency_ms && (
                              <tr>
                                <th>Average Latency</th>
                                <td>{safeElasticsearch.ping.avg_latency_ms} ms</td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    )}
                    
                    {safeElasticsearch.connection && (
                      <div className="mt-3">
                        <h5>HTTP Connection</h5>
                        <Table striped bordered>
                          <tbody>
                            <tr>
                              <th>Status Code</th>
                              <td>{safeElasticsearch.connection.status_code || 'N/A'}</td>
                            </tr>
                            <tr>
                              <th>Response Time</th>
                              <td>{safeElasticsearch.connection.total_latency_ms !== undefined ? `${safeElasticsearch.connection.total_latency_ms.toFixed(2)} ms` : 'N/A'}</td>
                            </tr>
                            <tr>
                              <th>DNS Resolution</th>
                              <td>{safeElasticsearch.connection.dns_resolved ? 'Success' : 'Failed'}</td>
                            </tr>
                          </tbody>
                        </Table>
                      </div>
                    )}
                    
                    {safeElasticsearch.query && (
                      <div className="mt-3">
                        <h5>Query Test</h5>
                        <Table striped bordered>
                          <tbody>
                            <tr>
                              <th>Success</th>
                              <td>{safeElasticsearch.query.success ? 'Yes' : 'No'}</td>
                            </tr>
                            {safeElasticsearch.query.hit_count !== undefined && (
                              <tr>
                                <th>Documents Found</th>
                                <td>{safeElasticsearch.query.hit_count}</td>
                              </tr>
                            )}
                            {safeElasticsearch.query.status_code && (
                              <tr>
                                <th>Status Code</th>
                                <td>{safeElasticsearch.query.status_code}</td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert variant="warning">
                    <Alert.Heading>Elasticsearch Status Unavailable</Alert.Heading>
                    <p>Unable to retrieve Elasticsearch status. Backend server may be unreachable.</p>
                  </Alert>
                )}
              </Accordion.Body>
            </Accordion.Item>
            
            <Accordion.Item eventKey="2">
              <Accordion.Header>
                Backend Errors
                {safeErrors.length > 0 && (
                  <Badge bg="danger" className="ms-2">{safeErrors.length}</Badge>
                )}
              </Accordion.Header>
              <Accordion.Body>
                {safeErrors.length > 0 ? (
                  <div>
                    <Alert variant="warning">
                      <Alert.Heading>Recent Backend Errors</Alert.Heading>
                      <p>These are the most recent errors logged by the backend service.</p>
                    </Alert>
                    
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {safeErrors.map((error, index) => (
                        <Alert key={index} variant="danger" className="mb-2">
                          {error.timestamp && (
                            <div>
                              <small>
                                {new Date(error.timestamp).toLocaleString()}
                              </small>
                            </div>
                          )}
                          {error.level && (
                            <Badge bg="warning" className="me-1">{error.level}</Badge>
                          )}
                          <div className="mt-1">
                            {error.message || error.raw || 'Unknown error'}
                          </div>
                          {error.exception && (
                            <div className="mt-1">
                              <small className="text-muted">
                                {error.exception.type}: {error.exception.value}
                              </small>
                            </div>
                          )}
                        </Alert>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert variant={isClientGenerated ? "warning" : "success"}>
                    <Alert.Heading>{isClientGenerated ? "Backend Errors Unavailable" : "No Recent Errors"}</Alert.Heading>
                    <p>{isClientGenerated 
                      ? "Unable to retrieve backend errors. Backend server may be unreachable." 
                      : "No backend errors have been recorded recently."}</p>
                  </Alert>
                )}
                
                {/* Always show frontend errors */}
                <h5 className="mt-4">
                  Frontend Errors 
                  {errorLogs.length > 0 && (
                    <Badge bg="danger" className="ms-2">{errorLogs.length}</Badge>
                  )}
                </h5>
                {errorLogs.length === 0 ? (
                  <Alert variant="success">
                    <p className="mb-0">No frontend errors logged</p>
                  </Alert>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {errorLogs.slice(-5).map((error, index) => (
                      <Alert key={index} variant="danger" className="mb-2">
                        {error.timestamp && (
                          <div>
                            <small>{new Date(error.timestamp).toLocaleString()}</small>
                          </div>
                        )}
                        <div className="mt-1">
                          <strong>{error.message || 'Unknown error'}</strong>
                        </div>
                        {error.error?.message && (
                          <div className="mt-1">
                            <small>{error.error.message}</small>
                          </div>
                        )}
                        {error.error?.url && (
                          <div className="mt-1">
                            <small className="text-muted">URL: {error.error.url}</small>
                          </div>
                        )}
                      </Alert>
                    ))}
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
          
          <div className="d-grid gap-2 d-md-flex justify-content-md-end">
            <Button 
              variant="primary" 
              onClick={runFullDiagnostics}
            >
              <i className="bi bi-arrow-repeat me-1"></i> Refresh Diagnostics
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center p-4">
        <p>Run a comprehensive diagnostic to see detailed information about the system and services.</p>
        <Button 
          variant="primary" 
          onClick={runFullDiagnostics}
          disabled={loadingDiagnostics}
        >
          <i className="bi bi-stethoscope me-1"></i> Run Full Diagnostics
        </Button>
      </div>
    );
  };

  return (
    <Container className="py-4">
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h4 className="m-0">
            <i className="bi bi-tools me-2"></i>
            Search Engine Diagnostic Tool
          </h4>
          <div>
            <Form.Check 
              type="switch"
              id="report-format-switch"
              label="LLM Format"
              checked={showCopyableFormat}
              onChange={() => setShowCopyableFormat(!showCopyableFormat)}
              className="text-white"
            />
          </div>
        </Card.Header>

        {showCopyableFormat ? (
          <Card.Body>
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
                  onClick={loadDiagnosticData}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i> Refresh Data
                </Button>
                <Button 
                  variant="outline-primary" 
                  onClick={runFullDiagnostics}
                  disabled={loadingDiagnostics}
                >
                  <i className="bi bi-stethoscope me-1"></i> Run Full Diagnostics
                </Button>
              </div>
            </Alert>
            
            <div className="bg-light p-3 border rounded monospace">
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {generateLLMReport()}
              </pre>
            </div>
          </Card.Body>
        ) : (
          <Card.Body>
            <Tabs
              activeKey={selectedDiagnosticTab}
              onSelect={(k) => setSelectedDiagnosticTab(k)}
              className="mb-3"
            >
              <Tab eventKey="basic" title="Basic Diagnostics">
                <Row>
                  <Col md={6}>
                    <h5>API Status</h5>
                    {loading ? (
                      <p>Loading health information...</p>
                    ) : (
                      <Alert variant={
                        healthStatus?.status === 'ok' ? 'success' :
                        healthStatus?.status === 'degraded' ? 'warning' : 'danger'
                      }>
                        <Alert.Heading>
                          {healthStatus?.status === 'ok' ? 'API is healthy' :
                           healthStatus?.status === 'degraded' ? 'API is degraded' : 'API is down'}
                        </Alert.Heading>
                        {healthStatus?.details && (
                          <pre className="mt-2 mb-0 small">
                            {JSON.stringify(healthStatus.details, null, 2)}
                          </pre>
                        )}
                        {healthStatus?.error && (
                          <div className="mt-2">
                            <strong>Error:</strong> {healthStatus.error}
                          </div>
                        )}
                        {/* Show a helpful message for connection refused errors */}
                        {healthStatus?.error && healthStatus.error.includes('Network Error') && (
                          <div className="mt-2">
                            <strong>Possible Causes:</strong>
                            <ul className="mb-0 mt-1">
                              <li>Backend server may be down or unreachable</li>
                              <li>CORS policies may be preventing connections</li>
                              <li>Network connectivity issues</li>
                              <li>Incorrect API URL configuration</li>
                            </ul>
                          </div>
                        )}
                      </Alert>
                    )}
                    
                    <div className="d-flex mt-3 mb-4">
                      <Button 
                        variant="primary" 
                        onClick={checkHealth} 
                        className="me-2"
                      >
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Refresh Status
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        onClick={testConnection}
                      >
                        <i className="bi bi-link me-1"></i>
                        Test Connection
                      </Button>
                    </div>
                    
                    {connectionTest && (
                      <Alert variant={
                        connectionTest.status === 'success' ? 'success' :
                        connectionTest.status === 'warning' ? 'warning' :
                        connectionTest.status === 'pending' ? 'info' : 'danger'
                      }>
                        <Alert.Heading>Connection Test</Alert.Heading>
                        <p>{connectionTest.message}</p>
                        {connectionTest.error && (
                          <div>
                            <strong>Error:</strong> {connectionTest.error}
                          </div>
                        )}
                        {connectionTest.possibleFixes && (
                          <div className="mt-2">
                            <strong>Possible Fixes:</strong>
                            <ul className="mb-0 mt-1">
                              {connectionTest.possibleFixes.map((fix, index) => (
                                <li key={index}>{fix}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {connectionTest.details && (
                          <Accordion className="mt-2">
                            <Accordion.Item eventKey="0">
                              <Accordion.Header>Connection Details</Accordion.Header>
                              <Accordion.Body>
                                <pre className="mb-0 small">
                                  {JSON.stringify(connectionTest.details, null, 2)}
                                </pre>
                              </Accordion.Body>
                            </Accordion.Item>
                          </Accordion>
                        )}
                      </Alert>
                    )}
                  </Col>
                  
                  <Col md={6}>
                    <h5>Environment</h5>
                    <Table striped bordered>
                      <tbody>
                        <tr>
                          <th>API URL</th>
                          <td>{envInfo.apiUrl}</td>
                        </tr>
                        <tr>
                          <th>Environment</th>
                          <td>
                            <Badge bg={envInfo.environment === 'production' ? 'danger' : 'info'}>
                              {envInfo.environment}
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <th>Network Status</th>
                          <td>
                            <Badge bg={networkInfo.online ? 'success' : 'danger'}>
                              {networkInfo.online ? 'Online' : 'Offline'}
                            </Badge>
                          </td>
                        </tr>
                        {networkInfo.connection && (
                          <>
                            <tr>
                              <th>Connection Type</th>
                              <td>{networkInfo.connection.effectiveType}</td>
                            </tr>
                            <tr>
                              <th>Downlink Speed</th>
                              <td>{networkInfo.connection.downlink} Mbps</td>
                            </tr>
                            <tr>
                              <th>Latency (RTT)</th>
                              <td>{networkInfo.connection.rtt} ms</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </Table>
                    
                    <h5 className="mt-4">Error Log ({errorLogs.length})</h5>
                    {errorLogs.length === 0 ? (
                      <Alert variant="success">
                        <p className="mb-0">No errors logged</p>
                      </Alert>
                    ) : (
                      <>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          {errorLogs.slice(-5).map((log, index) => (
                            <Alert key={index} variant="danger" className="mb-2">
                              <small>{new Date(log.timestamp).toLocaleString()}</small>
                              <div><strong>{log.message}</strong></div>
                              {log.error?.message && (
                                <div className="small">{log.error.message}</div>
                              )}
                              {log.error?.url && (
                                <div className="small text-muted">URL: {log.error.url}</div>
                              )}
                            </Alert>
                          ))}
                        </div>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={handleClearLogs}
                          className="mt-2"
                        >
                          <i className="bi bi-trash me-1"></i>
                          Clear Error Logs
                        </Button>
                      </>
                    )}
                  </Col>
                </Row>
                
                <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                  <Button 
                    variant="outline-primary" 
                    onClick={runFullDiagnostics}
                    disabled={loadingDiagnostics}
                  >
                    <i className="bi bi-stethoscope me-1"></i> Run Advanced Diagnostics
                  </Button>
                </div>
              </Tab>
              
              <Tab eventKey="advanced" title="Advanced Diagnostics">
                {renderAdvancedDiagnostics()}
              </Tab>
            </Tabs>
          </Card.Body>
        )}
      </Card>
    </Container>
  );
};

export default DiagnosticTool; 