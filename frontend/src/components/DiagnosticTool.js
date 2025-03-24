import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Accordion, Badge, Table, Alert, Form } from 'react-bootstrap';
import { checkApiHealth, getApiErrorLogs, clearApiErrorLogs } from '../services/api';

const DiagnosticTool = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [envInfo, setEnvInfo] = useState({});
  const [connectionTest, setConnectionTest] = useState(null);
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

  useEffect(() => {
    // Get environment info
    setEnvInfo({
      apiUrl: process.env.REACT_APP_API_URL || 'Not configured',
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
        error: error.message,
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
    setConnectionTest({ status: 'pending', message: 'Testing connection...' });
    try {
      // Try to fetch the API root
      const response = await fetch(envInfo.apiUrl, {
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
        error: error.message
      });
    }
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
                  } className="mb-4">
                    <p className="mb-1">{connectionTest.message}</p>
                    {connectionTest.error && <p className="mb-0 small">Error: {connectionTest.error}</p>}
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
                <h5>Network Information</h5>
                <Table striped bordered hover size="sm" className="mb-4">
                  <tbody>
                    <tr>
                      <td>Status</td>
                      <td>
                        <Badge bg={networkInfo.online ? 'success' : 'danger'}>
                          {networkInfo.online ? 'Online' : 'Offline'}
                        </Badge>
                      </td>
                    </tr>
                    {networkInfo.connection && (
                      <>
                        <tr>
                          <td>Connection Type</td>
                          <td>{networkInfo.connection.type || 'Unknown'}</td>
                        </tr>
                        <tr>
                          <td>Effective Type</td>
                          <td>{networkInfo.connection.effectiveType || 'Unknown'}</td>
                        </tr>
                        <tr>
                          <td>Downlink</td>
                          <td>{networkInfo.connection.downlink ? `${networkInfo.connection.downlink} Mbps` : 'Unknown'}</td>
                        </tr>
                        <tr>
                          <td>RTT</td>
                          <td>{networkInfo.connection.rtt ? `${networkInfo.connection.rtt} ms` : 'Unknown'}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </Table>
                
                <h5>Environment</h5>
                <Table striped bordered hover size="sm" className="mb-4">
                  <tbody>
                    <tr>
                      <td>API Endpoint</td>
                      <td>{envInfo.apiUrl}</td>
                    </tr>
                    <tr>
                      <td>Environment</td>
                      <td>{envInfo.environment}</td>
                    </tr>
                    <tr>
                      <td>Browser</td>
                      <td className="small">{navigator.userAgent}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
            </Row>
          </Card.Body>
        )}
      </Card>
      
      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="m-0">API Error Logs</h5>
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={handleClearLogs}
            disabled={errorLogs.length === 0}
          >
            <i className="bi bi-trash me-1"></i>
            Clear Logs
          </Button>
        </Card.Header>
        <Card.Body>
          {errorLogs.length === 0 ? (
            <Alert variant="info">No error logs found.</Alert>
          ) : (
            <Accordion>
              {errorLogs.map((log, index) => (
                <Accordion.Item eventKey={index.toString()} key={index}>
                  <Accordion.Header>
                    <span className="me-2">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <Badge bg="danger" className="me-2">
                      {log.error?.status || 'Error'}
                    </Badge>
                    {log.message}
                  </Accordion.Header>
                  <Accordion.Body>
                    <h6>Error Details</h6>
                    <Table striped bordered hover size="sm">
                      <tbody>
                        <tr>
                          <td>Message</td>
                          <td>{log.error?.message || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td>Status</td>
                          <td>{log.error?.status || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td>URL</td>
                          <td>{log.error?.url || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td>Method</td>
                          <td>{log.error?.method || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </Table>
                    
                    {log.error?.data && (
                      <>
                        <h6 className="mt-3">Response Data</h6>
                        <pre className="border rounded p-2 bg-light small">
                          {typeof log.error.data === 'string' 
                            ? log.error.data 
                            : JSON.stringify(log.error.data, null, 2)
                          }
                        </pre>
                      </>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DiagnosticTool; 