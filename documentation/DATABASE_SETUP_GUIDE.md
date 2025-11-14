# Database Setup and Initialization Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Creation](#database-creation)
3. [Flyway Configuration](#flyway-configuration)
4. [Migration Execution](#migration-execution)
5. [Seed Data](#seed-data)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Database Backup and Recovery](#database-backup-and-recovery)

---

## Prerequisites

### PostgreSQL Installation

The Pre-paid Health Plan Onboarding Portal requires PostgreSQL 15.0 or higher. Follow the appropriate instructions for your operating system.

#### macOS

Using Homebrew (recommended):

```bash
# Install PostgreSQL via Homebrew
brew install postgresql@15

# Start the PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
# Expected output: psql (PostgreSQL) 15.x
```

Or using PostgreSQL.app:

1. Download from [postgresql.app](https://postgresapp.com)
2. Install the application
3. Open the app and click "Initialize"
4. Add PostgreSQL to your PATH in `~/.zshrc` or `~/.bash_profile`:
   ```bash
   export PATH=$PATH:/Applications/Postgres.app/Contents/Versions/15/bin
   ```

#### Linux (Ubuntu/Debian)

```bash
# Update package manager
sudo apt-get update

# Install PostgreSQL 15
sudo apt-get install -y postgresql-15 postgresql-contrib-15

# Start the PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

#### Linux (CentOS/RHEL)

```bash
# Install the PostgreSQL repository
sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL 15
sudo yum install -y postgresql15-server postgresql15-contrib

# Initialize the database cluster
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

# Start the PostgreSQL service
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15

# Verify installation
psql --version
```

#### Windows

1. Download the PostgreSQL 15 installer from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer executable
3. During installation:
   - Choose installation directory
   - Set PostgreSQL superuser password (save this securely)
   - Configure port (default: 5432)
   - Select additional components (pgAdmin, Stack Builder)
4. Complete the installation
5. Verify installation by opening Command Prompt:
   ```cmd
   psql --version
   ```
6. Add PostgreSQL to PATH:
   - Right-click "This PC" > "Properties"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Add `C:\Program Files\PostgreSQL\15\bin` to your PATH

### Flyway CLI Installation

Flyway manages database migrations and schema versioning.

#### macOS

```bash
# Install Flyway using Homebrew
brew install flyway

# Verify installation
flyway -v
# Expected output: Flyway Community Edition x.x.x
```

#### Linux (Ubuntu/Debian)

```bash
# Download and install Flyway
cd /opt
sudo wget https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/9.22.3/flyway-commandline-9.22.3-linux-x64.tar.gz
sudo tar -xzf flyway-commandline-9.22.3-linux-x64.tar.gz
sudo ln -s /opt/flyway-9.22.3/flyway /usr/local/bin

# Verify installation
flyway -v
```

#### Linux (CentOS/RHEL)

```bash
# Download and install Flyway
cd /opt
sudo wget https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/9.22.3/flyway-commandline-9.22.3-linux-x64.tar.gz
sudo tar -xzf flyway-commandline-9.22.3-linux-x64.tar.gz
sudo ln -s /opt/flyway-9.22.3/flyway /usr/local/bin

# Verify installation
flyway -v
```

#### Windows

1. Download Flyway from [flywaydb.org](https://flywaydb.org/download)
2. Extract the ZIP file to `C:\Program Files\Flyway`
3. Add `C:\Program Files\Flyway` to your PATH:
   - Right-click "This PC" > "Properties"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Add the Flyway directory to PATH
4. Verify installation:
   ```cmd
   flyway -v
   ```

### Required Environment Variables

Create a `.env` file in the project root with the following variables. Copy from the example:

```bash
# Copy the environment template
cp src/backend/.env.example .env

# Edit the file with your specific values
# Required database variables:
POSTGRES_HOST=localhost          # PostgreSQL server hostname
POSTGRES_PORT=5432               # PostgreSQL server port
POSTGRES_DB=austa_health          # Database name
POSTGRES_USER=postgres            # Database user
POSTGRES_PASSWORD=your-password   # Database password (change in production)

# Optional but recommended:
POSTGRES_SSL_MODE=disable         # Development: disable, Production: verify-full
PGPASSWORD=${POSTGRES_PASSWORD}   # For automated scripts (set before running psql)
```

#### For Docker-based Setup

If running PostgreSQL in Docker, use:

```bash
POSTGRES_HOST=postgres            # Docker service name
POSTGRES_PORT=5432
POSTGRES_DB=austa_health
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure-password # Use a strong password
```

---

## Database Creation

### Step 1: Connect to PostgreSQL

#### Using PostgreSQL CLI

```bash
# Connect as superuser (default)
# macOS/Linux
psql -U postgres -h localhost

# Windows
psql -U postgres -h localhost
```

You'll be prompted for the password set during installation.

#### Using pgAdmin (GUI)

1. Open pgAdmin from Applications/Start Menu
2. Create a new connection:
   - Host: localhost
   - Port: 5432
   - Username: postgres
   - Password: (as set during installation)

### Step 2: Create Database

Using PostgreSQL CLI:

```bash
# Connect as superuser
psql -U postgres -h localhost

# At the psql prompt, create the database
CREATE DATABASE austa_health
    ENCODING = 'UTF8'
    LC_COLLATE = 'C'
    LC_CTYPE = 'C'
    TEMPLATE = template0
    OWNER = postgres;

# Verify creation
\l

# Output should show:
# austa_health | postgres | UTF8    | C       | C       |
```

Using SQL script:

```bash
# Create a file: create_database.sql
cat > create_database.sql << 'EOF'
-- Create the main database
CREATE DATABASE austa_health
    ENCODING = 'UTF8'
    LC_COLLATE = 'C'
    LC_CTYPE = 'C'
    TEMPLATE = template0
    OWNER = postgres;

-- Create schema
CREATE SCHEMA IF NOT EXISTS public;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
EOF

# Execute the script
psql -U postgres -h localhost -f create_database.sql
```

### Step 3: Create Database User

It's best practice to create a dedicated user for the application instead of using the superuser `postgres` account.

```bash
# Connect to PostgreSQL as superuser
psql -U postgres -h localhost

# Create a new user with password
CREATE USER austa_app WITH PASSWORD 'secure_password_here';

# Grant necessary permissions
ALTER ROLE austa_app WITH LOGIN CREATEDB;

# Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE austa_health TO austa_app;

# Grant privileges on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO austa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO austa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO austa_app;

# Verify the user was created
\du

# Output should show:
# austa_app | Create DB               |
```

Or using a SQL script:

```bash
cat > create_user.sql << 'EOF'
-- Create application user
CREATE USER austa_app WITH PASSWORD 'secure_password_here';

-- Grant necessary permissions
ALTER ROLE austa_app WITH LOGIN CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE austa_health TO austa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO austa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO austa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO austa_app;

-- Verify
SELECT rolname, rolcreatedb, rollogin FROM pg_roles WHERE rolname = 'austa_app';
EOF

psql -U postgres -h localhost -f create_user.sql
```

### Step 4: Verify Database Connection

```bash
# Test connection with the new user
psql -U austa_app -d austa_health -h localhost

# You should get a psql prompt:
# austa_health=>

# Type \q to exit
\q
```

### Connection String Format

For application configuration, use the following connection string format:

```
postgresql://username:password@host:port/database

# Example:
postgresql://austa_app:secure_password_here@localhost:5432/austa_health

# For Docker:
postgresql://austa_app:secure_password_here@postgres:5432/austa_health

# For production (with SSL):
postgresql://austa_app:secure_password_here@austa-db.postgres.database.azure.com:5432/austa_health?sslmode=require
```

---

## Flyway Configuration

### Step 1: Verify Flyway Configuration File

The Flyway configuration file should be located at `/src/backend/conf/flyway.conf`:

```bash
# Check if the file exists
ls -la src/backend/conf/flyway.conf

# If not, create it:
mkdir -p src/backend/conf
touch src/backend/conf/flyway.conf
```

### Step 2: Configure Flyway

Create or update `src/backend/conf/flyway.conf`:

```properties
# Flyway Configuration for AUSTA Health Portal

# Database Connection Configuration
flyway.driver=org.postgresql.Driver
flyway.url=jdbc:postgresql://localhost:5432/austa_health
flyway.user=austa_app
flyway.password=secure_password_here

# Migration Settings
flyway.locations=filesystem:./src/backend/db/migrations
flyway.baselineOnMigrate=false
flyway.validateOnMigrate=true
flyway.outOfOrder=false

# Schema and Tables
flyway.schemas=public
flyway.table=flyway_schema_history
flyway.placeholderReplacement=true

# Callbacks and Logging
flyway.sqlMigrationPrefix=V
flyway.undoSqlMigrationPrefix=U
flyway.sqlMigrationSeparator=__
flyway.sqlMigrationSuffixes=.sql

# Connection Pool Settings
flyway.connectRetries=3
flyway.connectRetriesInterval=1
flyway.lockRetryCount=50

# Other Settings
flyway.encoding=UTF-8
flyway.cleanDisabled=true
flyway.defaultSchema=public
```

### Step 3: Environment-Specific Configurations

#### Development Configuration

Create `src/backend/conf/flyway.dev.conf`:

```properties
# Development Environment
flyway.url=jdbc:postgresql://localhost:5432/austa_health
flyway.user=austa_app
flyway.password=dev_password
flyway.validateOnMigrate=true
flyway.baselineOnMigrate=true
flyway.locations=filesystem:./src/backend/db/migrations
```

#### Docker Configuration

Create `src/backend/conf/flyway.docker.conf`:

```properties
# Docker Environment
flyway.url=jdbc:postgresql://postgres:5432/austa_health
flyway.user=austa_app
flyway.password=${POSTGRES_PASSWORD}
flyway.validateOnMigrate=true
flyway.locations=filesystem:/migrations
```

#### Production Configuration

Create `src/backend/conf/flyway.prod.conf`:

```properties
# Production Environment
flyway.url=jdbc:postgresql://austa-db.postgres.database.azure.com:5432/austa_health
flyway.user=austa_app@austa-db
flyway.password=${POSTGRES_PASSWORD}
flyway.validateOnMigrate=true
flyway.baselineOnMigrate=false
flyway.locations=filesystem:/migrations
flyway.placeholders.environment=production
flyway.placeholders.log_level=error
```

### Configuration Parameter Explanation

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `flyway.driver` | - | JDBC driver class for PostgreSQL |
| `flyway.url` | - | Database connection URL (JDBC format) |
| `flyway.user` | - | Database username for authentication |
| `flyway.password` | - | Database password for authentication |
| `flyway.schemas` | public | PostgreSQL schema(s) to manage |
| `flyway.table` | flyway_schema_history | Table name for migration history |
| `flyway.locations` | filesystem:sql | Location(s) of migration files |
| `flyway.sqlMigrationPrefix` | V | Prefix for versioned migrations |
| `flyway.sqlMigrationSeparator` | __ | Separator between version and description |
| `flyway.validateOnMigrate` | false | Validate migrations against applied migrations |
| `flyway.baselineOnMigrate` | false | Auto-baseline if schema is not empty |
| `flyway.cleanDisabled` | true | Prevent accidental clean() calls in production |
| `flyway.connectRetries` | 0 | Number of retries for connection failures |

---

## Migration Execution

### Prerequisites

Before running migrations, ensure:

1. PostgreSQL is running and accessible
2. Database and user are created
3. `.env` file is configured with correct credentials
4. Flyway is installed and accessible
5. You're in the project root directory

### Step 1: Verify Migration Files

```bash
# List available migration files
ls -lh src/backend/db/migrations/

# Expected output:
# V001__create_users_table.sql
# V002__create_enrollments_table.sql
# V003__create_health_questionnaires_table.sql
# V004__create_documents_table.sql
# V005__create_policies_table.sql
# V006__create_payments_table.sql
# V007__create_audit_logs_table.sql
# V008__create_sessions_table.sql
# V009__create_indexes.sql
# V010__insert_seed_data.sql

# Count total migrations
ls src/backend/db/migrations/V*.sql | wc -l
```

### Step 2: Validate Current Status

```bash
# Check the current migration status without making changes
flyway -configFiles=src/backend/conf/flyway.conf \
       -baselineOnMigrate=false \
       info

# Output shows:
# | Version | Description | Type | Installed On | State |
# | 001 | create users table | SQL | ... | Success |
# | 002 | create enrollments table | SQL | ... | Success |
# etc.
```

### Step 3: Run Migrations

#### Option A: Using Flyway CLI

```bash
# Run all pending migrations
flyway -configFiles=src/backend/conf/flyway.conf migrate

# Output indicates each migration applied:
# Successfully applied 10 migrations
```

#### Option B: Using Docker Compose

If PostgreSQL is running in Docker:

```bash
# Start all services (includes database)
docker-compose -f src/backend/docker-compose.yml up -d

# Create network if needed
docker network create backend || true

# Run migrations from Docker
docker run --rm \
  --network backend \
  -v $(pwd)/src/backend/db/migrations:/migrations \
  -v $(pwd)/src/backend/conf/flyway.conf:/flyway/conf/flyway.conf \
  -e FLYWAY_URL=jdbc:postgresql://postgres:5432/austa_health \
  -e FLYWAY_USER=austa_app \
  -e FLYWAY_PASSWORD=${POSTGRES_PASSWORD} \
  flyway/flyway:latest migrate
```

#### Option C: Using Maven (Java Projects)

If using Maven with the Flyway plugin:

```bash
# In the backend directory
cd src/backend

# Run migrations via Maven
mvn flyway:migrate

# Clean and baseline (careful with production!)
mvn flyway:baseline
```

### Step 4: Verify Migration Success

```bash
# Get detailed migration status
flyway -configFiles=src/backend/conf/flyway.conf info

# Expected output:
# +-----------+------------------------------+----------+-----+---------+
# | Version   | Description                  | Type     | ... | State   |
# +-----------+------------------------------+----------+-----+---------+
# | 1         | create users table           | SQL      | ... | Success |
# | 2         | create enrollments table     | SQL      | ... | Success |
# | 3         | create health questionnaire  | SQL      | ... | Success |
# | 4         | create documents table       | SQL      | ... | Success |
# | 5         | create policies table        | SQL      | ... | Success |
# | 6         | create payments table        | SQL      | ... | Success |
# | 7         | create audit logs table      | SQL      | ... | Success |
# | 8         | create sessions table        | SQL      | ... | Success |
# | 9         | create indexes               | SQL      | ... | Success |
# | 10        | insert seed data             | SQL      | ... | Success |
# +-----------+------------------------------+----------+-----+---------+
```

### Step 5: Connect and Validate Schema

```bash
# Connect to the database
psql -U austa_app -d austa_health -h localhost

# List all tables
\dt

# Expected tables:
# users
# roles
# user_roles
# enrollments
# health_questionnaires
# documents
# policies
# payments
# audit_logs
# sessions
# flyway_schema_history (migration tracking)
```

### Rollback Procedures

#### Rollback Last Migration (Flyway Community Edition)

Note: Flyway Community Edition doesn't support undo. To rollback, you must:

1. **Manual Rollback Approach**

```bash
# Create rollback script
cat > rollback.sql << 'EOF'
-- Drop tables in reverse order of creation
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS health_questionnaires CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Delete from migration history
DELETE FROM flyway_schema_history WHERE version > 9;
EOF

# Execute rollback
psql -U austa_app -d austa_health -h localhost -f rollback.sql
```

2. **Using Flyway Pro (Commercial)**

```bash
# With Flyway Pro/Enterprise edition, use:
flyway -configFiles=src/backend/conf/flyway.conf undo
```

3. **Baseline to Specific Version**

```bash
# If you need to start fresh
flyway -configFiles=src/backend/conf/flyway.conf clean
flyway -configFiles=src/backend/conf/flyway.conf baseline -baselineVersion=0
```

### Troubleshooting Migrations

#### Migration Fails with Version Error

```bash
# Check the flyway_schema_history table
psql -U austa_app -d austa_health -h localhost \
  -c "SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"

# Manually fix migration history if needed
psql -U austa_app -d austa_health -h localhost \
  -c "DELETE FROM flyway_schema_history WHERE version = '999';"
```

#### Validation Errors

```bash
# Run Flyway info to see detailed errors
flyway -configFiles=src/backend/conf/flyway.conf info

# To skip validation temporarily
flyway -configFiles=src/backend/conf/flyway.conf \
       -validateOnMigrate=false \
       migrate
```

---

## Seed Data

### Overview

Seed data includes default users and reference data required for application bootstrap and testing.

### Included Seed Data

#### Default Users

The seed data migration (`V010__insert_seed_data.sql`) creates three default users:

| Email | Role | Password | MFA | Purpose |
|-------|------|----------|-----|---------|
| `admin@healthplan.example.com` | SUPER_ADMIN | Admin@123456 | Yes | System administrator with full access |
| `broker@healthplan.example.com` | BROKER | Broker@123456 | No | Demo broker for testing enrollment flow |
| `beneficiary@healthplan.example.com` | BENEFICIARY | Beneficiary@123456 | No | Demo beneficiary for testing enrollment |

**SECURITY WARNING**: These credentials are for development and testing only. Change all default passwords immediately in production environments.

### Password Hashing

All passwords are hashed using bcrypt with cost factor 12:

```bash
# To generate a bcrypt hash for a new password
# Using Python
python3 -c "import bcrypt; print(bcrypt.hashpw(b'YourPassword123', bcrypt.gensalt(12)).decode())"

# Using Node.js
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('YourPassword123', 12));"
```

### Seed Data SQL Structure

```sql
-- Users Table Seed
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    mfa_enabled,
    created_at,
    updated_at
) VALUES (
    'uuid-here'::UUID,
    'user@example.com',
    'bcrypt_hash_here',
    'First',
    'Last',
    'ROLE_NAME',
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;
```

### Customizing Seed Data

#### Add New Users

1. Generate bcrypt hash for password:
   ```bash
   python3 -c "import bcrypt; print(bcrypt.hashpw(b'SecurePassword123!', bcrypt.gensalt(12)).decode())"
   ```

2. Create migration file `src/backend/db/migrations/V011__add_custom_users.sql`:
   ```sql
   -- Add custom users
   INSERT INTO users (
       id,
       email,
       password_hash,
       first_name,
       last_name,
       role,
       created_at,
       updated_at
   ) VALUES (
       'custom-uuid-here'::UUID,
       'newuser@healthplan.example.com',
       '$2b$12$hash_here',
       'Custom',
       'User',
       'BROKER',
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
   ) ON CONFLICT (email) DO NOTHING;
   ```

3. Run migrations:
   ```bash
   flyway -configFiles=src/backend/conf/flyway.conf migrate
   ```

#### Add Reference Data

Create a new migration for additional reference data:

```sql
-- V011__add_reference_data.sql
-- Add health categories
INSERT INTO health_categories (id, name, description) VALUES
    (uuid_generate_v4(), 'Cardiovascular', 'Heart and circulatory system'),
    (uuid_generate_v4(), 'Respiratory', 'Lungs and breathing system'),
    (uuid_generate_v4(), 'Endocrine', 'Hormones and metabolism');

-- Add document types
INSERT INTO document_types (id, name, required) VALUES
    (uuid_generate_v4(), 'GOVERNMENT_ID', true),
    (uuid_generate_v4(), 'PROOF_OF_INCOME', true),
    (uuid_generate_v4(), 'MEDICAL_RECORDS', false);
```

#### Disable Seed Data in Production

For production deployments, you may want to exclude the seed data migration:

```bash
# Skip seed data migration
flyway -configFiles=src/backend/conf/flyway.conf \
       -placeholders.skipSeed=true \
       migrate
```

### Verify Seed Data

```bash
# Check inserted users
psql -U austa_app -d austa_health -h localhost \
  -c "SELECT id, email, role, mfa_enabled FROM users ORDER BY created_at;"

# Output:
# id | email | role | mfa_enabled
# ---|-------|------|------------
# a0000000-0000-0000-0000-000000000001 | admin@healthplan.example.com | SUPER_ADMIN | t
# b0000000-0000-0000-0000-000000000001 | broker@healthplan.example.com | BROKER | f
# c0000000-0000-0000-0000-000000000001 | beneficiary@healthplan.example.com | BENEFICIARY | f
```

---

## Verification

### Schema Verification

#### Verify All Tables Created

```bash
# List all tables in the public schema
psql -U austa_app -d austa_health -h localhost \
  -c "
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  "

# Expected output:
# tablename
# ------------------------------------------------
# audit_logs
# documents
# enrollments
# health_questionnaires
# payments
# policies
# roles
# sessions
# user_roles
# users
```

#### Verify Table Structures

```bash
# Check users table structure
psql -U austa_app -d austa_health -h localhost \
  -c "\d users"

# Expected output includes:
# Column | Type | Collation | Nullable | Default
# ----------|------|-----------|----------|--------
# id | uuid | | not null | uuid_generate_v4()
# email | character varying(255) | | not null |
# password_hash | character varying(255) | | not null |
# first_name | character varying(100) | | not null |
# last_name | character varying(100) | | not null |
# role | character varying(50) | | not null |
# mfa_enabled | boolean | | not null | false
# ... more columns

# Similar for other tables:
psql -U austa_app -d austa_health -h localhost -c "\d enrollments"
psql -U austa_app -d austa_health -h localhost -c "\d documents"
psql -U austa_app -d austa_health -h localhost -c "\d policies"
```

### Index Verification

```bash
# List all indexes
psql -U austa_app -d austa_health -h localhost \
  -c "
    SELECT schemaname, tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  "

# Expected indexes include:
# idx_users_email
# idx_users_role
# idx_users_created_at
# idx_users_lockout_until
# idx_enrollments_beneficiary
# idx_enrollments_status
# idx_documents_enrollment_id
# idx_policies_enrollment_id
# idx_policies_status
# ... more indexes
```

### Constraints Verification

```bash
# List all foreign key constraints
psql -U austa_app -d austa_health -h localhost \
  -c "
    SELECT
        constraint_name,
        table_name,
        column_name,
        foreign_table_name,
        foreign_column_name
    FROM information_schema.key_column_usage
    WHERE table_schema = 'public'
    AND foreign_table_name IS NOT NULL
    ORDER BY table_name;
  "

# Expected constraints:
# fk_enrollments_beneficiary
# fk_enrollments_broker
# fk_documents_enrollment_id
# fk_policies_enrollment_id
# fk_payments_policy_id
# ... more constraints
```

### Seed Data Verification

```bash
# Count users by role
psql -U austa_app -d austa_health -h localhost \
  -c "
    SELECT role, COUNT(*) as count
    FROM users
    GROUP BY role
    ORDER BY count DESC;
  "

# Expected output:
# role | count
# ----------|-------
# SUPER_ADMIN | 1
# BROKER | 1
# BENEFICIARY | 1

# Verify specific admin user
psql -U austa_app -d austa_health -h localhost \
  -c "
    SELECT id, email, first_name, last_name, role, mfa_enabled
    FROM users
    WHERE email = 'admin@healthplan.example.com';
  "
```

### Views Verification

```bash
# List all views
psql -U austa_app -d austa_health -h localhost \
  -c "
    SELECT viewname
    FROM pg_views
    WHERE schemaname = 'public'
    ORDER BY viewname;
  "

# Expected views:
# v_enrollment_dashboard
# v_policy_summary
# v_user_roles

# Test views with sample queries
psql -U austa_app -d austa_health -h localhost \
  -c "SELECT COUNT(*) FROM v_user_roles;"

psql -U austa_app -d austa_health -h localhost \
  -c "SELECT COUNT(*) FROM v_policy_summary;"
```

### Migration History Verification

```bash
# Check migration history
psql -U austa_app -d austa_health -h localhost \
  -c "
    SELECT version, description, type, installed_on, success
    FROM flyway_schema_history
    ORDER BY installed_rank;
  "

# Expected output:
# version | description | type | installed_on | success
# ---------|-------------|------|---|--------
# 1 | create users table | SQL | ... | t
# 2 | create enrollments table | SQL | ... | t
# ... all 10 migrations
```

### Comprehensive Health Check

```bash
# Create a comprehensive verification script
cat > verify_database.sql << 'EOF'
-- Database Verification Script

-- 1. Check all required tables exist
\echo '=== Table Verification ==='
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 2. Check table row counts
\echo '=== Table Row Counts ==='
SELECT
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 3. Check indexes
\echo '=== Index Count ==='
SELECT COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public';

-- 4. Check views
\echo '=== View Count ==='
SELECT COUNT(*) as total_views
FROM pg_views
WHERE schemaname = 'public';

-- 5. Check constraints
\echo '=== Foreign Key Count ==='
SELECT COUNT(*) as total_fks
FROM information_schema.key_column_usage
WHERE table_schema = 'public' AND foreign_table_name IS NOT NULL;

-- 6. Database size
\echo '=== Database Size ==='
SELECT
    datname,
    pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname = 'austa_health';

-- 7. Check migrations applied
\echo '=== Migrations Applied ==='
SELECT COUNT(*) as total_migrations FROM flyway_schema_history;
EOF

# Run the verification script
psql -U austa_app -d austa_health -h localhost -f verify_database.sql
```

---

## Troubleshooting

### Common Issues and Solutions

#### Connection Refused

**Problem**: `FATAL: Ident authentication failed for user "austa_app"`

**Solution**:

```bash
# Check PostgreSQL is running
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Check connection string
psql -U austa_app -h localhost -d austa_health

# If authentication fails, check pg_hba.conf
# macOS
cat /usr/local/var/postgres/pg_hba.conf

# Linux
sudo cat /etc/postgresql/15/main/pg_hba.conf

# Update authentication method to md5 or password:
# Edit pg_hba.conf and change:
# local   all             all                                     ident
# to:
# local   all             all                                     md5

# Restart PostgreSQL
# macOS
brew services restart postgresql@15

# Linux
sudo systemctl restart postgresql
```

#### Database Does Not Exist

**Problem**: `database "austa_health" does not exist`

**Solution**:

```bash
# Create the database
psql -U postgres -h localhost

# In psql prompt:
CREATE DATABASE austa_health OWNER austa_app;

# Or from command line:
createdb -U postgres -h localhost austa_health
```

#### Permission Denied

**Problem**: `ERROR: permission denied for schema public`

**Solution**:

```bash
# Grant permissions to the user
psql -U postgres -h localhost -d austa_health

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO austa_app;
GRANT CREATE ON SCHEMA public TO austa_app;

-- Grant table permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO austa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO austa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO austa_app;

-- Grant existing table permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO austa_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO austa_app;
```

#### Flyway Configuration Not Found

**Problem**: `Unable to open config file: /path/to/flyway.conf`

**Solution**:

```bash
# Create flyway config directory
mkdir -p src/backend/conf

# Create config file
cat > src/backend/conf/flyway.conf << 'EOF'
flyway.driver=org.postgresql.Driver
flyway.url=jdbc:postgresql://localhost:5432/austa_health
flyway.user=austa_app
flyway.password=secure_password_here
flyway.locations=filesystem:./src/backend/db/migrations
flyway.schemas=public
EOF

# Verify file exists
ls -la src/backend/conf/flyway.conf
```

#### Migration Version Conflict

**Problem**: `Detected resolved migration not applied to database: 3::add_new_column`

**Solution**:

```bash
# Check migration history
psql -U austa_app -d austa_health -h localhost \
  -c "SELECT * FROM flyway_schema_history ORDER BY version DESC;"

# Option 1: Delete conflicting migration history entries
psql -U austa_app -d austa_health -h localhost \
  -c "DELETE FROM flyway_schema_history WHERE version = 3;"

# Option 2: Run with validateOnMigrate disabled
flyway -configFiles=src/backend/conf/flyway.conf \
       -validateOnMigrate=false \
       migrate

# Option 3: Clean and start over (CAREFUL - loses data)
flyway -configFiles=src/backend/conf/flyway.conf clean
flyway -configFiles=src/backend/conf/flyway.conf baseline
```

#### Out of Disk Space

**Problem**: `could not extend file "base/16384/16385": No space left on device`

**Solution**:

```bash
# Check available disk space
df -h

# Find large files/tables
psql -U austa_app -d austa_health -h localhost \
  -c "
    SELECT schemaname, tablename,
           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  "

# Clean up old logs or backups
du -sh /var/lib/postgresql/

# Backup and restore to reduce bloat
pg_dump -U austa_app -h localhost austa_health > backup.sql
dropdb -U postgres -h localhost austa_health
createdb -U postgres -h localhost austa_health
psql -U austa_app -h localhost austa_health < backup.sql
```

#### Slow Migrations

**Problem**: Migrations taking too long to execute

**Solution**:

```bash
# Monitor migration progress
psql -U austa_app -d austa_health -h localhost \
  -c "SELECT * FROM pg_stat_activity WHERE query LIKE 'CREATE%' OR query LIKE 'ALTER%';"

# Check index creation progress (PostgreSQL 12+)
psql -U austa_app -d austa_health -h localhost \
  -c "SELECT * FROM pg_stat_progress_create_index;"

# For large index creation, increase work_mem temporarily
psql -U postgres -h localhost -d austa_health \
  -c "ALTER SYSTEM SET work_mem = '512MB';"

# Reload configuration
psql -U postgres -h localhost \
  -c "SELECT pg_reload_conf();"
```

#### Encoding Issues

**Problem**: `invalid byte sequence for encoding "UTF8"`

**Solution**:

```bash
# Recreate database with correct encoding
psql -U postgres -h localhost

-- Backup existing data first
\copy users TO 'users_backup.csv' WITH CSV HEADER;

-- Drop database
DROP DATABASE austa_health;

-- Recreate with proper encoding
CREATE DATABASE austa_health
    ENCODING 'UTF8'
    LC_COLLATE 'en_US.UTF-8'
    LC_CTYPE 'en_US.UTF-8'
    OWNER austa_app;

-- Re-run migrations
```

---

## Database Backup and Recovery

### Automated Backups

#### Using pg_dump

```bash
# Full database backup
pg_dump -U austa_app -h localhost \
        -d austa_health \
        --format custom \
        --file austa_health_$(date +%Y%m%d_%H%M%S).backup

# Backup specific table
pg_dump -U austa_app -h localhost \
        -d austa_health \
        -t users \
        --file users_backup.sql

# Backup with compression
pg_dump -U austa_app -h localhost \
        -d austa_health \
        -Fc \
        -f austa_health_compressed.backup
```

#### Using pg_basebackup (for physical backups)

```bash
# Create base backup directory
mkdir -p /backup/postgres

# Create backup
pg_basebackup -U austa_app \
              -h localhost \
              -D /backup/postgres \
              -Ft \
              -z \
              -v

# Verify backup
ls -lh /backup/postgres/
```

#### Automated Backup Script

```bash
#!/bin/bash
# daily_backup.sh

BACKUP_DIR="/backups/postgres"
DB_NAME="austa_health"
DB_USER="austa_app"
DB_HOST="localhost"
DAYS_TO_KEEP=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.backup"

# Perform backup
pg_dump -U $DB_USER -h $DB_HOST -d $DB_NAME \
        --format custom \
        --file $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Clean old backups
find $BACKUP_DIR -name "*.backup.gz" -mtime +$DAYS_TO_KEEP -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

Schedule with cron:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * /home/user/daily_backup.sh
```

### Recovery Procedures

#### Full Database Recovery

```bash
# Stop application
docker-compose down

# Restore from custom format backup
pg_restore -U austa_app \
           -h localhost \
           -d austa_health \
           -v \
           austa_health_20240101_120000.backup

# Or restore from SQL backup
psql -U austa_app -h localhost -d austa_health < austa_health_backup.sql

# Verify recovery
psql -U austa_app -h localhost -d austa_health \
  -c "SELECT COUNT(*) FROM users;"

# Start application
docker-compose up -d
```

#### Partial Recovery (Specific Tables)

```bash
# Extract specific table from backup
pg_restore -U austa_app \
           -h localhost \
           -d austa_health \
           -t users \
           austa_health_backup.backup

# Or from SQL dump
grep "^CREATE TABLE users" -A 100 backup.sql | psql -U austa_app -d austa_health
```

#### Point-in-Time Recovery

```bash
# With WAL archiving enabled, restore to specific time
pg_restore -U austa_app \
           -h localhost \
           -d austa_health \
           -X restore-command='/path/to/wal/archive/%f' \
           -target-time='2024-01-15 10:30:00' \
           base_backup.backup
```

### Backup Verification

```bash
# Test restore to temporary database
createdb -U postgres -h localhost austa_health_test

pg_restore -U austa_app \
           -h localhost \
           -d austa_health_test \
           austa_health_backup.backup

# Run verification
psql -U austa_app -h localhost -d austa_health_test -f verify_database.sql

# Drop test database
dropdb -U postgres -h localhost austa_health_test
```

---

## Additional Resources

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/15/index.html)
- [Flyway Documentation](https://flywaydb.org/documentation/)
- [Database Design Guide](/documentation/database/design.md)
- [Security Best Practices](/SECURITY.md)
- [Infrastructure Documentation](/infrastructure/README.md)

---

## Support and Troubleshooting

For issues not covered in this guide:

1. Check PostgreSQL logs:
   ```bash
   # macOS
   tail -f /usr/local/var/log/postgres.log

   # Linux
   sudo journalctl -u postgresql -f
   ```

2. Enable Flyway debugging:
   ```bash
   flyway -configFiles=src/backend/conf/flyway.conf \
          -debug \
          migrate
   ```

3. Contact the development team at dev-support@austa.com

---

**Last Updated**: November 2024
**Version**: 1.0
**Maintainer**: AUSTA Development Team
