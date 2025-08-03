// Database Schema Management Utility
// Run with: node scripts/manage-schema.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate TypeScript types from database
async function generateTypes() {
  console.log('🔧 Generating TypeScript Types...\n');

  try {
    // Get table schemas
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .order('table_name')
      .order('ordinal_position');

    if (error) {
      console.error('Error fetching schema:', error);
      return;
    }

    // Group by table
    const tables = {};
    columns.forEach(col => {
      if (!tables[col.table_name]) {
        tables[col.table_name] = [];
      }
      tables[col.table_name].push(col);
    });

    // Generate TypeScript interfaces
    let typeDefinitions = '// Auto-generated database types\n\n';
    
    Object.entries(tables).forEach(([tableName, cols]) => {
      const interfaceName = tableName.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('');

      typeDefinitions += `export interface ${interfaceName} {\n`;
      
      cols.forEach(col => {
        const tsType = mapPostgresToTS(col.data_type);
        const optional = col.is_nullable === 'YES' ? '?' : '';
        typeDefinitions += `  ${col.column_name}${optional}: ${tsType};\n`;
      });
      
      typeDefinitions += '}\n\n';
    });

    // Write to file
    const typesPath = path.join(__dirname, '../types/database.ts');
    fs.writeFileSync(typesPath, typeDefinitions);
    
    console.log('✅ Types generated at:', typesPath);
    console.log('📄 Preview:');
    console.log(typeDefinitions.substring(0, 500) + '...\n');

  } catch (error) {
    console.error('Error generating types:', error);
  }
}

// Map PostgreSQL types to TypeScript types
function mapPostgresToTS(pgType) {
  const typeMap = {
    'uuid': 'string',
    'text': 'string',
    'varchar': 'string',
    'character varying': 'string',
    'integer': 'number',
    'bigint': 'number',
    'boolean': 'boolean',
    'timestamp with time zone': 'string',
    'timestamp without time zone': 'string',
    'date': 'string',
    'json': 'any',
    'jsonb': 'any'
  };
  
  return typeMap[pgType] || 'any';
}

// Check database constraints and relationships
async function analyzeConstraints() {
  console.log('🔗 Database Relationships & Constraints:\n');

  try {
    // Foreign key constraints
    const { data: fks, error: fkError } = await supabase
      .from('information_schema.table_constraints')
      .select('table_name, constraint_name, constraint_type')
      .eq('table_schema', 'public')
      .eq('constraint_type', 'FOREIGN KEY');

    if (fkError) {
      console.error('Error fetching constraints:', fkError);
    } else {
      console.log('🔑 Foreign Key Constraints:');
      fks.forEach(fk => {
        console.log(`  - ${fk.table_name}: ${fk.constraint_name}`);
      });
    }

    // Check indexes
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('tablename, indexname, indexdef')
      .eq('schemaname', 'public');

    if (indexError) {
      console.error('Error fetching indexes:', indexError);
    } else {
      console.log('\n📊 Database Indexes:');
      indexes.forEach(idx => {
        console.log(`  - ${idx.tablename}.${idx.indexname}`);
      });
    }

  } catch (error) {
    console.error('Error analyzing constraints:', error);
  }
}

// Create migration template
function createMigrationTemplate() {
  console.log('📝 Migration Template Created:\n');

  const migrationTemplate = `-- Migration: ${new Date().toISOString().split('T')[0]}_description
-- Created: ${new Date().toISOString()}

-- Create new table example
CREATE TABLE IF NOT EXISTS example_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security)
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view their own records" ON example_table
  FOR SELECT USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_example_table_created_at ON example_table(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON example_table
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();
`;

  const migrationPath = path.join(__dirname, '../database/migrations', `${Date.now()}_template.sql`);
  
  // Create migrations directory if it doesn't exist
  const migrationsDir = path.dirname(migrationPath);
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  fs.writeFileSync(migrationPath, migrationTemplate);
  
  console.log('📄 Migration template created at:', migrationPath);
  console.log('💡 Edit this file and run it via Supabase Dashboard or CLI\n');
}

// Main execution
async function main() {
  console.log('🗄️  Database Schema Management Tool\n');
  
  await generateTypes();
  await analyzeConstraints();
  createMigrationTemplate();
  
  console.log('✅ Schema management complete!');
  console.log('\n📖 Next Steps:');
  console.log('1. Review generated types in types/database.ts');
  console.log('2. Use migration template for schema changes');
  console.log('3. Run migrations via Supabase Dashboard or CLI');
}

main().catch(console.error);