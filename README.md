# NOCIQ Backend

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python)](https://www.python.org/)
[![Stellar](https://img.shields.io/badge/Stellar-Integrated-7D00FF?logo=stellar)](https://stellar.org/)

> High-performance blockchain-powered REST API for NOCIQ - Network Operations Center Intelligence & Quality with Stellar network integration

## 🌟 Overview

NOCIQ Backend is the core API service powering the NOCIQ platform with **Stellar blockchain integration**. Built with FastAPI, it provides robust endpoints for managing network outages, performing analytics, and **automating SLA-based payments** through Soroban smart contracts on the Stellar network.

**🚀 Stellar Features**: Automated penalty/reward calculations, instant cross-border payments, smart contract execution, and immutable audit trails.

**Frontend Repository:** [noc-iq-fe](https://github.com/OpSoll/noc-iq-fe)  
**Smart Contracts:** [Soroban SLA Calculator](https://github.com/OpSoll/noc-iq-contracts)  
**API Documentation:** Available at `/docs` when running

## ✨ Key Features

### 🔌 RESTful API
- **Fast & Async**: Built on FastAPI with async/await support
- **Auto-generated Docs**: Interactive Swagger UI and ReDoc
- **Type Safety**: Pydantic models for request/response validation
- **CORS Support**: Configured for cross-origin requests
- **Rate Limiting**: Protect against abuse

### 💰 Blockchain Integration (Stellar)
- **Smart Contract Integration**: Soroban-powered SLA calculations
- **Automated Payments**: Instant penalty/reward processing via Stellar
- **Wallet Management**: Create and manage Stellar wallets for users/organizations
- **Transaction Monitoring**: Real-time payment status tracking
- **Multi-Asset Support**: USDC (payments), NOCIQ tokens (rewards), XLM (fees)
- **Immutable Audit Trails**: Store RCA hashes on-chain

### 📊 Outage Management
- CRUD operations for network outages
- Advanced filtering and search
- Bulk import/export (CSV, JSON)
- Automated report generation
- **NEW:** Real-time SLA status calculation
- **NEW:** Automatic payment trigger on outage resolution

### 🎯 Root Cause Analysis (RCA)
- Structured RCA tracking
- Categorization and tagging
- Historical analysis
- **NEW:** Blockchain-backed RCA hash storage
- Pattern recognition

### 📈 Analytics Engine
- MTTR (Mean Time To Repair) calculations
- Site-level performance metrics
- **NEW:** SLA compliance reporting
- **NEW:** Payment analytics and forecasting
- Trend analysis
- Custom report generation

### 🔐 Authentication & Security
- Firebase Authentication integration
- JWT token validation
- Role-based access control (RBAC)
- **NEW:** Stellar wallet binding per user
- API rate limiting
- Secure key management for blockchain operations

## 🛠️ Technology Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | FastAPI 0.109+ |
| **Language** | Python 3.9+ |
| **Database** | Google Firestore (NoSQL) |
| **Authentication** | Firebase Admin SDK |
| **Blockchain** | ⭐ **Stellar SDK (Python)**, Soroban Client |
| **Data Processing** | Pandas, NumPy |
| **Visualization** | Matplotlib, Seaborn, Plotly |
| **Mapping** | Folium |
| **Validation** | Pydantic |
| **ASGI Server** | Uvicorn |
| **Testing** | Pytest, pytest-asyncio |
| **Documentation** | Swagger UI, ReDoc |

## 🚀 Getting Started

### Prerequisites

- **Python**: 3.9 or higher ([Download](https://www.python.org/downloads/))
- **pip**: Python package installer
- **Git**: For version control
- **Firebase Project**: For Firestore and Authentication
- **Stellar Account**: For blockchain operations ([Create testnet account](https://laboratory.stellar.org/#account-creator?network=test))
- **Virtual Environment**: Recommended (venv or conda)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/OpSoll/noc-iq-be.git
   cd noc-iq-be
   ```

2. **Create a virtual environment**
   ```bash
   # Using venv
   python -m venv venv
   
   # Activate virtual environment
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY_ID=your_private_key_id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your_client_id
   
   # Application Settings
   APP_ENV=development
   DEBUG=True
   HOST=0.0.0.0
   PORT=8000
   
   # CORS Settings
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   
   # API Configuration
   API_V1_PREFIX=/api/v1
   PROJECT_NAME=NOCIQ API
   
   # Rate Limiting
   RATE_LIMIT_PER_MINUTE=60
   
   # Stellar Configuration 🆕
   STELLAR_NETWORK=testnet
   STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
   STELLAR_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
   
   # Stellar Wallet Keys 🆕
   STELLAR_POOL_SECRET_KEY=S...  # Pool wallet secret (keep secure!)
   STELLAR_POOL_PUBLIC_KEY=G...  # Pool wallet public key
   
   # Smart Contract Addresses 🆕
   SLA_CONTRACT_ID=C...  # Deployed SLA calculator contract ID
   USDC_TOKEN_ADDRESS=C...  # USDC token contract address
   NOCIQ_TOKEN_ADDRESS=C...  # NOCIQ token contract address
   
   # Payment Settings 🆕
   AUTO_PAYMENT_ENABLED=true
   MAX_AUTO_PAYMENT_AMOUNT=10000  # Max auto-payment in USDC
   PAYMENT_APPROVAL_THRESHOLD=5000  # Require approval above this
   ```

5. **Initialize the database** (if required)
   ```bash
   python scripts/init_db.py
   ```

6. **Deploy Soroban contracts** (first time setup)
   ```bash
   # Navigate to contracts directory
   cd contracts
   
   # Build contracts
   cargo build --target wasm32-unknown-unknown --release
   
   # Deploy to testnet
   soroban contract deploy \
     --wasm target/wasm32-unknown-unknown/release/sla_calculator.wasm \
     --network testnet
   
   # Copy the contract ID to your .env file
   ```

7. **Run the development server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at:
   - **API**: `http://localhost:8000`
   - **Interactive Docs**: `http://localhost:8000/docs`
   - **ReDoc**: `http://localhost:8000/redoc`

### Quick Test

```bash
# Check API health
curl http://localhost:8000/health

# Expected response:
# {"status": "healthy", "version": "1.0.0", "stellar_connected": true}

# Test Stellar connection 🆕
curl http://localhost:8000/api/v1/stellar/status

# Expected response:
# {
#   "network": "testnet",
#   "horizon_url": "https://horizon-testnet.stellar.org",
#   "pool_address": "G...",
#   "pool_balance_xlm": 10000.0,
#   "pool_balance_usdc": 50000.0
# }
```

## 📁 Project Structure

```
noc-iq-be/
├── app/
│   ├── api/              # API route handlers
│   │   ├── v1/          # API version 1
│   │   │   ├── endpoints/
│   │   │   │   ├── outages.py
│   │   │   │   ├── rca.py
│   │   │   │   ├── analytics.py
│   │   │   │   ├── reports.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── stellar_payments.py  # 🆕 Stellar payments
│   │   │   │   ├── wallets.py           # 🆕 Wallet management
│   │   │   │   └── sla.py               # 🆕 SLA management
│   │   │   └── router.py
│   │   └── deps.py      # Dependencies (auth, db)
│   ├── core/            # Core application logic
│   │   ├── config.py    # Configuration settings
│   │   ├── security.py  # Security utilities
│   │   └── exceptions.py
│   ├── models/          # Pydantic models
│   │   ├── outage.py
│   │   ├── rca.py
│   │   ├── user.py
│   │   ├── response.py
│   │   ├── stellar.py           # 🆕 Stellar models
│   │   └── payment.py           # 🆕 Payment models
│   ├── services/        # Business logic
│   │   ├── outage_service.py
│   │   ├── rca_service.py
│   │   ├── analytics_service.py
│   │   ├── report_service.py
│   │   ├── stellar/             # 🆕 Stellar services
│   │   │   ├── stellar_service.py
│   │   │   ├── payment_service.py
│   │   │   ├── wallet_service.py
│   │   │   ├── soroban_service.py
│   │   │   └── token_service.py
│   │   └── sla/                 # 🆕 SLA services
│   │       ├── sla_calculator.py
│   │       ├── sla_monitor.py
│   │       └── penalty_reward_engine.py
│   ├── db/              # Database utilities
│   │   ├── firestore.py
│   │   └── repositories/
│   ├── utils/           # Utility functions
│   │   ├── date_utils.py
│   │   ├── export_utils.py
│   │   ├── validation.py
│   │   └── stellar_utils.py     # 🆕 Stellar helpers
│   └── middleware/      # Custom middleware
│       ├── auth.py
│       ├── cors.py
│       └── rate_limit.py
├── config/              # Configuration files
│   └── firebase-credentials.json
├── contracts/           # 🆕 Soroban smart contracts
│   ├── sla_calculator/
│   ├── payment_escrow/
│   └── multi_party_settlement/
├── tests/               # Test suite
│   ├── unit/
│   ├── integration/
│   ├── stellar/         # 🆕 Stellar integration tests
│   └── conftest.py
├── scripts/             # Utility scripts
│   ├── init_db.py
│   ├── seed_data.py
│   └── deploy_contracts.sh  # 🆕 Contract deployment
├── .env.example         # Environment variables template
├── .gitignore
├── main.py              # Application entry point
├── requirements.txt     # Python dependencies
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout

### Outages
- `GET /api/v1/outages` - List all outages (with filters)
- `GET /api/v1/outages/{id}` - Get outage by ID
- `POST /api/v1/outages` - Create new outage
- `PUT /api/v1/outages/{id}` - Update outage
- `DELETE /api/v1/outages/{id}` - Delete outage
- `POST /api/v1/outages/bulk-import` - Import multiple outages
- `GET /api/v1/outages/export` - Export outages (CSV/JSON)

### SLA Management 🆕
- `GET /api/v1/sla/status/{outage_id}` - Get SLA status
- `POST /api/v1/sla/calculate` - Calculate SLA for resolved outage
- `POST /api/v1/sla/execute-payment` - Execute SLA-based payment
- `GET /api/v1/sla/configs` - Get SLA configurations
- `PUT /api/v1/sla/configs` - Update SLA configuration (admin)

### Stellar Payments 🆕
- `POST /api/v1/payments/process-sla` - Process SLA payment
- `GET /api/v1/payments/history` - Get payment history
- `GET /api/v1/payments/{tx_hash}` - Get payment details
- `POST /api/v1/payments/manual` - Manual payment (admin)
- `GET /api/v1/payments/pending` - Get pending payments

### Wallet Management 🆕
- `POST /api/v1/wallets/create` - Create Stellar wallet
- `GET /api/v1/wallets/{user_id}` - Get wallet details
- `GET /api/v1/wallets/{address}/balance` - Get wallet balance
- `POST /api/v1/wallets/{address}/fund` - Fund wallet (testnet)

### Smart Contracts 🆕
- `POST /api/v1/contracts/invoke` - Invoke Soroban contract
- `GET /api/v1/contracts/sla/result/{outage_id}` - Get contract result
- `GET /api/v1/stellar/status` - Get Stellar network status

### Root Cause Analysis (RCA)
- `GET /api/v1/rca` - List all RCA records
- `GET /api/v1/rca/{id}` - Get RCA by ID
- `POST /api/v1/rca` - Create RCA record
- `PUT /api/v1/rca/{id}` - Update RCA record
- `DELETE /api/v1/rca/{id}` - Delete RCA record
- `POST /api/v1/rca/{id}/store-hash` - 🆕 Store RCA hash on blockchain

### Analytics
- `GET /api/v1/analytics/mttr` - Calculate MTTR metrics
- `GET /api/v1/analytics/trends` - Get outage trends
- `GET /api/v1/analytics/site-performance` - Site-level metrics
- `GET /api/v1/analytics/heatmap` - Generate heatmap data
- `GET /api/v1/analytics/dashboard` - Dashboard statistics
- `GET /api/v1/analytics/payments` - 🆕 Payment analytics

### Reports
- `POST /api/v1/reports/generate` - Generate custom report
- `GET /api/v1/reports/{id}` - Download report
- `GET /api/v1/reports/whatsapp/{id}` - Get WhatsApp-formatted report

### System
- `GET /health` - Health check
- `GET /` - API information

**Full API documentation available at `/docs` when the server is running.**

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_outage_service.py

# Run Stellar integration tests 🆕
pytest tests/stellar/

# Run with verbose output
pytest -v

# Run only integration tests
pytest tests/integration/
```

### Stellar Testing on Testnet

```python
# tests/stellar/test_sla_payment.py
import pytest
from app.services.stellar.payment_service import PaymentService

@pytest.mark.asyncio
async def test_sla_payment_flow():
    """Test complete SLA payment flow on Stellar testnet"""
    service = PaymentService(network="testnet")
    
    # Create test outage
    outage = {
        "severity": "critical",
        "mttr_minutes": 25,  # Over 15 min threshold
    }
    
    # Calculate SLA
    sla_result = await service.calculate_sla(outage)
    assert sla_result["status"] == "violated"
    assert sla_result["penalty_amount"] > 0
    
    # Execute payment (on testnet)
    payment = await service.execute_payment(sla_result)
    assert payment["tx_hash"] is not None
    assert payment["status"] == "confirmed"
```

## 🔧 Development

### Code Style

We follow PEP 8 and use the following tools:

```bash
# Format code with black
black app/

# Sort imports
isort app/

# Lint with flake8
flake8 app/

# Type checking with mypy
mypy app/
```

## 📦 Dependencies

Key dependencies in `requirements.txt`:

```txt
# Core
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0

# Firebase
firebase-admin>=6.4.0

# Data Processing
pandas>=2.2.0
numpy>=1.26.0

# Visualization
matplotlib>=3.8.0
seaborn>=0.13.0
plotly>=5.18.0
folium>=0.15.0

# Stellar Integration 🆕
stellar-sdk>=9.1.0
soroban-client>=1.0.0

# Authentication & Security
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-dotenv>=1.0.0

# Testing
pytest>=7.4.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0
httpx>=0.26.0
```

## 🚀 Deployment

### Using Docker (Recommended)

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build image
docker build -t nociq-backend .

# Run container
docker run -d -p 8000:8000 --env-file .env nociq-backend
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/stellar-escrow`
3. Write tests for your changes
4. Make your changes
5. Run tests: `pytest`
6. Run linters: `black app/ && flake8 app/`
7. Commit: `git commit -m "feat: add payment escrow contract"`
8. Push: `git push origin feature/stellar-escrow`
9. Open a Pull Request

### Stellar-Specific Guidelines

- **Always test on Testnet** before mainnet deployment
- Include **transaction hashes** in PR descriptions
- **Document contract changes** in detail
- Add **unit tests** for all Stellar functions (95%+ coverage)
- Follow **Stellar SDK best practices**
- Use proper **key management** (never commit private keys)

## 📊 Performance

- **Requests per second**: 1000+ (with proper setup)
- **Response time**: <100ms (average for simple queries)
- **Stellar transaction time**: 3-5 seconds (network confirmation)
- **Smart contract execution**: <1 second
- **Concurrent connections**: Handles high load with async/await

## 🔐 Security

- JWT token authentication
- Password hashing with bcrypt
- CORS protection
- Rate limiting
- Input validation with Pydantic
- **Secure key storage** for Stellar wallets (AWS Secrets Manager/KMS)
- **Multi-signature support** for high-value transactions
- **Transaction validation** before execution
- Regular dependency updates


## 🐛 Bug Reports & Feature Requests

[Open an issue](https://github.com/OpSoll/noc-iq-be/issues/new) with:
- Clear description
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Request/response examples
- For Stellar issues: Include transaction hash and network
- Environment details (Python version, OS, etc.)

## 📚 Documentation

- [API Documentation](docs/API.md) - Detailed endpoint descriptions
- [Stellar Integration Guide](docs/STELLAR_INTEGRATION.md) 🆕
- [Smart Contract Documentation](docs/SMART_CONTRACTS.md) 🆕
- [Database Schema](docs/DATABASE.md) - Firestore collections structure
- [Development Guide](docs/DEVELOPMENT.md) - Setup and workflows
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Architecture](docs/ARCHITECTURE.md) - System design

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Database powered by [Google Firestore](https://firebase.google.com/docs/firestore)
- Blockchain integration with [Stellar](https://stellar.org/) ⭐
- Smart contracts on [Soroban](https://soroban.stellar.org/) ⭐
- Data processing with [Pandas](https://pandas.pydata.org/)
- Visualization using [Matplotlib](https://matplotlib.org/), [Seaborn](https://seaborn.pydata.org/), and [Plotly](https://plotly.com/)

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/OpSoll/noc-iq-be/issues)
- **Discussions**: [GitHub Discussions](https://github.com/OpSoll/noc-iq-be/discussions)
- **Stellar Questions**: [Stellar Discord](https://discord.gg/stellardev)

## 🗺️ Roadmap

- [x] Basic Stellar integration
- [x] SLA smart contract deployment
- [x] Automated payment processing
- [x] Wallet management API
- [ ] Multi-signature transaction support
- [ ] Payment batching for gas optimization
- [ ] Advanced smart contract features (escrow, multi-party)
- [ ] GraphQL API support
- [ ] Real-time WebSocket notifications
- [ ] ML-based RCA predictions
- [ ] Prometheus metrics export
- [ ] Redis caching layer
- [ ] Kubernetes deployment configs

---

**Made with ❤️ by the OpSoll Team | Powered by Stellar ⭐**

**Building on Stellar? Join us in the [Stellar Wave Program](https://www.drips.network/wave/stellar)!**
