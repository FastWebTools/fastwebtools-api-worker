CREATE TABLE IF NOT EXISTS notices(id TEXT PRIMARY KEY,payload TEXT NOT NULL,visibility TEXT NOT NULL CHECK(visibility IN ('draft','published','archived')),version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL,request_hash TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS notices_visibility_updated ON notices(visibility,updated_at);
CREATE TABLE IF NOT EXISTS resources(id TEXT PRIMARY KEY,status TEXT NOT NULL CHECK(status IN ('Working','Issues','Maintenance','Not verified')),note TEXT NOT NULL DEFAULT '',checked_at TEXT,source TEXT NOT NULL DEFAULT 'manual',updated_by TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS checks(id INTEGER PRIMARY KEY AUTOINCREMENT,resource_id TEXT NOT NULL,checked_at TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL,http_code INTEGER);
CREATE INDEX IF NOT EXISTS checks_resource_time ON checks(resource_id,checked_at);
CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL,updated_by TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,object_id TEXT NOT NULL,created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS login_limits(id TEXT PRIMARY KEY,attempts INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS audit_notices_insert AFTER INSERT ON notices BEGIN INSERT INTO audit(actor,action,object_id,created_at) VALUES(NEW.updated_by,'notices_insert',NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
CREATE TRIGGER IF NOT EXISTS audit_notices_update AFTER UPDATE ON notices BEGIN INSERT INTO audit(actor,action,object_id,created_at) VALUES(NEW.updated_by,'notices_update',NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
CREATE TRIGGER IF NOT EXISTS audit_resources_insert AFTER INSERT ON resources BEGIN INSERT INTO audit(actor,action,object_id,created_at) VALUES(NEW.updated_by,'resources_insert',NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
CREATE TRIGGER IF NOT EXISTS audit_resources_update AFTER UPDATE ON resources BEGIN INSERT INTO audit(actor,action,object_id,created_at) VALUES(NEW.updated_by,'resources_update',NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
CREATE TRIGGER IF NOT EXISTS audit_settings_insert AFTER INSERT ON settings BEGIN INSERT INTO audit(actor,action,object_id,created_at) VALUES(NEW.updated_by,'settings_insert',NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
CREATE TRIGGER IF NOT EXISTS audit_settings_update AFTER UPDATE ON settings BEGIN INSERT INTO audit(actor,action,object_id,created_at) VALUES(NEW.updated_by,'settings_update',NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
