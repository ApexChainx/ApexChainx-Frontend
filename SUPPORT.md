# ApexChain Frontend Support

## Getting Help

If you need help with ApexChain Frontend, here are your options:

### Documentation
- **README.md** - Project overview, setup, and architecture
- **docs/API.md** - Complete API documentation
- **docs/STELLAR_INTEGRATION.md** - Stellar blockchain integration guide
- **docs/CODEX_CONTEXT.md** - Development context and architecture
- **CONTRIBUTING.md** - Contribution guidelines

### Community
- **GitHub Issues** - Report bugs or request features
- **GitHub Discussions** - Ask questions and share ideas
- **Discord** - Join our community server (link TBD)

### Common Issues

#### Build fails
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

#### Type errors
```bash
# Run TypeScript check
npx tsc --noEmit
```

#### Test failures
```bash
# Run tests with verbose output
npm run test -- --reporter=verbose
```

## Enterprise Support

For enterprise support, SLA guarantees, and dedicated assistance, contact the ApexChain team.

---

Built with ❤️ by the ApexChain team
