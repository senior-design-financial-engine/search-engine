import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Alert, Button, Spinner, Badge, 
  Table, Accordion, Card, ProgressBar
} from 'react-bootstrap';
import { checkApiHealth, getApiErrorLogs, clearApiErrorLogs } from '../../services/api';

const BasicDiagnostics = ({ onRunAdvanced }) => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionTest, setConnectionTest] = useState(null);
  const [envInfo, setEnvInfo] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [networkInfo, setNetworkInfo] = useState({
    online: navigator.onLine,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
    } : null
  });

  useEffect(() => {
    // Set environment info
    setEnvInfo({
      apiUrl: process.env.REACT_APP_API_URL || 'Not configured',
      environment: process.env.REACT_APP_ENV || 'development'
    });

    // Load health data and error logs
    loadDiagnosticData();

    // Setup network listeners
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
    checkHealth();
  };

  const loadDiagnosticData = async () => {
    setLoading(true);
    await checkHealth();
    loadErrorLogs();
    setLoading(false);
  };

  const checkHealth = async () => {
    setRefreshing(true);
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
    } finally {
      setRefreshing(false);
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

  const getStatusVariant = (status) => {
    switch(status) {
      case 'ok': return 'success';
      case 'degraded': return 'warning'; 
      case 'error': return 'danger';
      default: return 'info';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'ok': return 'bi-check-circle-fill';
      case 'degraded': return 'bi-exclamation-triangle-fill';
      case 'error': return 'bi-x-circle-fill';
      default: return 'bi-question-circle-fill';
    }
  };

  return (
    <>
      {loading ? (
        <div className="text-center p-5">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-3">Loading diagnostic information...</p>
        </div>
      ) : (
        <>
          <Row className="mb-4">
            <Col lg={6} className="mb-3 mb-lg-0">
              <Card className="diagnostic-card h-100">
                <Card.Header className="diagnostic-header">
                  <h5 className="diagnostic-title">
                    <i className="bi bi-activity me-2 text-primary"></i>
                    API Status
                  </h5>
                  <Badge 
                    bg={getStatusVariant(healthStatus?.status)} 
                    className="px-3 py-2 status-badge"
                  >
                    <i className={`bi ${getStatusIcon(healthStatus?.status)} me-1`}></i>
                    {healthStatus?.status === 'ok' ? 'Healthy' : 
                     healthStatus?.status === 'degraded' ? 'Degraded' : 'Offline'}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  {healthStatus?.error && (
                    <Alert variant="danger" className="mb-3">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <strong>Error:</strong> {healthStatus.error}
                    </Alert>
                  )}
                  
                  {healthStatus?.details?.services && (
                    <div className="diagnostic-section">
                      <h6 className="diagnostic-section-title">
                        <i className="bi bi-layers me-2"></i>
                        Services Status
                      </h6>
                      <div className="mb-3">
                        {Object.entries(healthStatus.details.services).map(([service, status]) => (
                          <div key={service} className="d-flex align-items-center mb-2">
                            <Badge 
                              bg={status ? 'success' : 'danger'} 
                              className="me-2"
                            >
                              <i className={`bi ${status ? 'bi-check' : 'bi-x'}`}></i>
                            </Badge>
                            <span className="text-capitalize">{service}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="d-flex gap-2">
                    <Button 
                      variant="primary" 
                      onClick={checkHealth}
                      disabled={refreshing}
                    >
                      <i className={`bi bi-arrow-clockwise me-1 refresh-btn ${refreshing ? 'spinning' : ''}`}></i>
                      {refreshing ? 'Refreshing...' : 'Refresh Status'}
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      onClick={testConnection}
                    >
                      <i className="bi bi-link me-1"></i>
                      Test Connection
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={6}>
              <Card className="diagnostic-card h-100">
                <Card.Header className="diagnostic-header">
                  <h5 className="diagnostic-title">
                    <i className="bi bi-gear me-2 text-primary"></i>
                    Environment
                  </h5>
                  <Badge 
                    bg={networkInfo.online ? 'success' : 'danger'}
                    className="px-3 py-2 status-badge"
                  >
                    <i className={`bi ${networkInfo.online ? 'bi-wifi' : 'bi-wifi-off'} me-1`}></i>
                    {networkInfo.online ? 'Online' : 'Offline'}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover className="info-table mb-3">
                    <tbody>
                      <tr>
                        <th>API URL</th>
                        <td>
                          <code>{envInfo.apiUrl}</code>
                        </td>
                      </tr>
                      <tr>
                        <th>Environment</th>
                        <td>
                          <Badge bg={envInfo.environment === 'production' ? 'danger' : 'info'}>
                            {envInfo.environment}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                  
                  {networkInfo.connection && (
                    <div className="diagnostic-section">
                      <h6 className="diagnostic-section-title">
                        <i className="bi bi-speedometer me-2"></i>
                        Network Metrics
                      </h6>
                      <Row>
                        <Col sm={6} className="mb-3">
                          <div className="metrics-card">
                            <div className="metrics-label">Connection Type</div>
                            <div className="metrics-value">
                              {networkInfo.connection.effectiveType.toUpperCase()}
                            </div>
                          </div>
                        </Col>
                        <Col sm={6} className="mb-3">
                          <div className="metrics-card">
                            <div className="metrics-label">Downlink Speed</div>
                            <div className="metrics-value">
                              {networkInfo.connection.downlink} <small>Mbps</small>
                            </div>
                            <ProgressBar 
                              variant="info" 
                              now={Math.min(networkInfo.connection.downlink * 5, 100)} 
                              className="mt-2"
                            />
                          </div>
                        </Col>
                        <Col sm={12}>
                          <div className="metrics-card">
                            <div className="metrics-label">Latency (RTT)</div>
                            <div className="metrics-value">
                              {networkInfo.connection.rtt} <small>ms</small>
                            </div>
                            <ProgressBar 
                              variant={
                                networkInfo.connection.rtt < 50 ? "success" : 
                                networkInfo.connection.rtt < 100 ? "info" : 
                                networkInfo.connection.rtt < 200 ? "warning" : "danger"
                              } 
                              now={Math.min(100 - (networkInfo.connection.rtt / 5), 100)} 
                              className="mt-2"
                            />
                          </div>
                        </Col>
                      </Row>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row className="mb-4">
            <Col xs={12}>
              {connectionTest && (
                <Card className="diagnostic-card mb-4">
                  <Card.Header className={`diagnostic-header bg-${
                    connectionTest.status === 'success' ? 'success' :
                    connectionTest.status === 'warning' ? 'warning' :
                    connectionTest.status === 'pending' ? 'info' : 'danger'
                  } text-white`}>
                    <h5 className="diagnostic-title">
                      <i className={`bi ${
                        connectionTest.status === 'success' ? 'bi-check-circle' :
                        connectionTest.status === 'warning' ? 'bi-exclamation-triangle' :
                        connectionTest.status === 'pending' ? 'bi-hourglass' : 'bi-x-circle'
                      } me-2`}></i>
                      Connection Test Results
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <p>{connectionTest.message}</p>
                    {connectionTest.error && (
                      <Alert variant="danger">
                        <strong>Error:</strong> {connectionTest.error}
                      </Alert>
                    )}
                    {connectionTest.details && (
                      <Accordion className="mt-3">
                        <Accordion.Item eventKey="0">
                          <Accordion.Header>Response Details</Accordion.Header>
                          <Accordion.Body>
                            <pre className="mb-0 bg-light p-3 rounded monospace">
                              {JSON.stringify(connectionTest.details, null, 2)}
                            </pre>
                          </Accordion.Body>
                        </Accordion.Item>
                      </Accordion>
                    )}
                  </Card.Body>
                </Card>
              )}
              
              <Card className="diagnostic-card">
                <Card.Header className="diagnostic-header">
                  <h5 className="diagnostic-title">
                    <i className="bi bi-exclamation-triangle me-2 text-primary"></i>
                    Error Logs
                  </h5>
                  <Badge pill bg="danger" className="status-badge">
                    {errorLogs.length}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  {errorLogs.length === 0 ? (
                    <Alert variant="success">
                      <i className="bi bi-check-circle me-2"></i>
                      No errors logged
                    </Alert>
                  ) : (
                    <div className="mb-3">
                      {errorLogs.slice(-5).reverse().map((log, index) => (
                        <div key={index} className="error-item">
                          <div className="error-timestamp">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                          <div className="error-message">
                            <strong>{log.message}</strong>
                          </div>
                          {log.error && (
                            <div className="error-details">
                              {log.error.status && <span>Status: {log.error.status}</span>}
                              {log.error.url && <span> | URL: {log.error.url}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      {errorLogs.length > 0 && (
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={handleClearLogs}
                        >
                          <i className="bi bi-trash me-1"></i>
                          Clear Logs
                        </Button>
                      )}
                    </div>
                    <Button 
                      variant="primary" 
                      onClick={onRunAdvanced}
                    >
                      <i className="bi bi-graph-up me-1"></i>
                      Run Advanced Diagnostics
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </>
  );
};

export default BasicDiagnostics; 