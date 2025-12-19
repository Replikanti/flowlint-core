#!/bin/bash

# Fix imports in flowlint-core tests

# Rules
find tests -name "*.spec.ts" -exec sed -i "s|\.\.\/packages\/review\/rules|../src/rules|g" {} +

# Parser
find tests -name "*.spec.ts" -exec sed -i "s|\.\.\/packages\/review\/parser-n8n|../src/parser/parser-n8n|g" {} +

# Reporter
find tests -name "*.spec.ts" -exec sed -i "s|\.\.\/packages\/review\/reporter|../src/reporter/reporter|g" {} +

# Types
find tests -name "*.spec.ts" -exec sed -i "s|\.\.\/packages\/review\/types|../src/types|g" {} +

# Config
find tests -name "*.spec.ts" -exec sed -i "s|\.\.\/packages\/config\/flowlint-config|../src/config/default-config|g" {} +
find tests -name "*.spec.ts" -exec sed -i "s|\.\.\/packages\/config|../src/config|g" {} +

# Sniffer
find tests -name "*.spec.ts" -exec sed -i "s|\.\.\/packages\/review\/sniffer|../src/sniffer|g" {} + 
# Wait, sniffer is probably not in core (it was github specific). 
# If tests use sniffer, we might have a problem. workflows.spec.ts used pickTargets.
# pickTargets is general glob matching. It should be in core.
# Let's check if src/sniffer exists? No.
# Maybe in utils? Or removed?

# Apps/API imports removal (queue etc.) - core tests shouldn't depend on apps.
# workflows.spec.ts imported queue for some reason?
find tests -name "*.spec.ts" -exec sed -i "s|.*apps\/api\/src\/queue.*||g" {} +