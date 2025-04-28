import React, { useState } from 'react';
import { Container, Card, Form, Nav, Badge } from 'react-bootstrap';
import BasicDiagnostics from './BasicDiagnostics';
import AdvancedDiagnostics from './AdvancedDiagnostics';
import DiagnosticReport from './DiagnosticReport';
import './styles.css';

const DiagnosticTool = () => {
  const [activeTab, setActiveTab] = useState('basic');
  const [showReport, setShowReport] = useState(false);

  return (
    <Container className="diagnostic-tool py-4">
      <Card className="diagnostic-card shadow-sm">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <i className="bi bi-tools me-2 fs-4"></i>
            <h4 className="m-0">Search Engine Diagnostics</h4>
            <Badge bg="light" text="dark" className="ms-2 px-2">
              <i className="bi bi-info-circle me-1"></i>
              v2.0
            </Badge>
          </div>
          <div className="d-flex align-items-center">
            <Form.Check 
              type="switch"
              id="report-format-switch"
              label="LLM Report Format"
              checked={showReport}
              onChange={() => setShowReport(!showReport)}
              className="text-white me-2"
            />
          </div>
        </Card.Header>

        {showReport ? (
          <DiagnosticReport />
        ) : (
          <>
            <Card.Header className="bg-light">
              <Nav variant="tabs" className="diagnostic-tabs card-header-tabs">
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'basic'} 
                    onClick={() => setActiveTab('basic')}
                    className={activeTab === 'basic' ? 'active' : ''}
                  >
                    <i className="bi bi-speedometer2 me-1"></i>
                    Basic Diagnostics
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'advanced'} 
                    onClick={() => setActiveTab('advanced')}
                    className={activeTab === 'advanced' ? 'active' : ''}
                  >
                    <i className="bi bi-graph-up me-1"></i>
                    Advanced Diagnostics
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>
            <Card.Body className="bg-white">
              {activeTab === 'basic' ? (
                <BasicDiagnostics onRunAdvanced={() => setActiveTab('advanced')} />
              ) : (
                <AdvancedDiagnostics />
              )}
            </Card.Body>
            <Card.Footer className="text-muted bg-light">
              <small>
                <i className="bi bi-info-circle me-1"></i>
                Use the diagnostic tools to troubleshoot API connectivity, analyze performance, and resolve issues.
              </small>
            </Card.Footer>
          </>
        )}
      </Card>
    </Container>
  );
};

export default DiagnosticTool; 