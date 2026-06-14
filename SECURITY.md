# ApexChain Frontend Security Policy

## Supported Versions

Only the latest release of ApexChain Frontend receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in ApexChain Frontend, please report it responsibly.

**Do not open a public issue.** Instead, please:

1. Email the ApexChain security team at: **security@apexchain.com** (placeholder)
2. Include a detailed description of the vulnerability
3. Include steps to reproduce if possible
4. Allow up to 48 hours for an initial response

## Security Practices

### For Contributors

- **Never commit secrets** (API keys, private keys, passwords, tokens)
- Use **environment variables** for all sensitive configuration
- Follow the **principle of least privilege** when implementing features
- **Validate all user inputs** on both client and server
- **Sanitize outputs** to prevent XSS attacks
- Use **Content Security Policy (CSP)** headers
- Keep **all dependencies up to date**
- Review code for **OWASP Top 10** vulnerabilities

### For Maintainers

- Review all PRs for security implications
- Run dependency vulnerability scans: `npm audit`
- Keep Node.js and npm versions current
- Monitor GitHub security advisories
- Rotate secrets periodically
- Use branch protection rules
- Require code review before merge
- Enable Dependabot for automated dependency updates

## Security Architecture

### Authentication
- JWT-based authentication with refresh tokens
- Tokens stored in httpOnly cookies where possible
- Session management with automatic cross-tab synchronization
- Automatic logout on token expiration

### Stellar / Blockchain
- All private keys managed client-side via Freighter wallet
- Server-side keys stored in secure vault (not in code or env files)
- Smart contracts audited before mainnet deployment
- Auto-payment limits enforced to prevent large unauthorized transfers

### API Communication
- All API calls use HTTPS in production
- Axios interceptors handle token refresh automatically
- Rate limiting enforced on backend
- CORS configured to allow only trusted origins

### Data Handling
- No sensitive data logged to console
- Error messages sanitized before display
- Input validation on all forms
- TypeScript strict mode prevents type-related vulnerabilities

## Dependency Security

To check for known vulnerabilities:

```bash
npm audit
```

To fix automatically where possible:

```bash
npm audit fix
```

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who report valid vulnerabilities (when desired).
