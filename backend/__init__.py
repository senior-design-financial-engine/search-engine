"""
Financial News Engine backend package
"""

__version__ = '1.0.0'
__author__ = 'Team 14'

# Import core modules to make them accessible
try:
    # Import main module components
    from .backend import app as flask_app
except ImportError:
    # Create a simple fallback app for testing or troubleshooting
    import logging
    logging.warning("Could not import main backend module. Module initialized with limited functionality.")
