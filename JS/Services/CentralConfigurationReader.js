// GPSpedia — lector central de configuración (MIG-008)
// No contiene IDs, URLs de servicios, credenciales ni llamadas servicio-a-servicio.
// Cada proyecto Apps Script lee únicamente su contenedor activo; si no existe, falla cerrado.
var GP_CONFIG_SCHEMA_VERSION_ = 1;
var GP_CONFIG_FRESH_TTL_MS_ = 5 * 60 * 1000;
var GP_CONFIG_STALE_TTL_MS_ = 15 * 60 * 1000;
var GP_CONFIG_CACHE_TTL_SECONDS_ = 900;
var GP_CONFIG_SERVICE_KEYS_ = ["AUTH", "CATALOG", "WRITE", "USERS", "FEEDBACK", "UTILITIES", "ADMIN"];
var GP_CONFIG_PARAMETER_RULES_ = {
  rich_text_mode: { valueType: "enum", values: ["strict", "advanced"], scope: "global", visibility: "public", owner: "FEEDBACK" }
};

function getPublicCentralConfiguration_() {
  return getCentralConfigurationSnapshot_("public", "");
}

function getCentralConfigurationForService_(serviceKey) {
  var key = String(serviceKey || "").trim().toUpperCase();
  if (GP_CONFIG_SERVICE_KEYS_.indexOf(key) < 0) throw centralConfigurationError_("UNKNOWN_SERVICE", "Servicio de configuración desconocido.");
  return getCentralConfigurationSnapshot_("backend", key);
}

function getCentralConfigurationSnapshot_(visibility, serviceKey) {
  var cacheKey = "GP_CONFIG_V1_" + visibility + (serviceKey ? "_" + serviceKey : "");
  var cache = null, cached = null, now = Date.now();
  try {
    if (typeof CacheService !== "undefined") {
      cache = CacheService.getScriptCache();
      var raw = cache.get(cacheKey);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.snapshot && Number.isFinite(Number(parsed.fetchedAtMs))) cached = parsed;
      }
    }
  } catch (cacheReadError) { cached = null; }
  if (cached && now - Number(cached.fetchedAtMs) <= GP_CONFIG_FRESH_TTL_MS_) {
    return projectCentralConfiguration_(cached.snapshot, visibility, serviceKey, false, true);
  }
  try {
    var snapshot = readCentralConfigurationSnapshot_();
    var record = { fetchedAtMs: now, snapshot: snapshot };
    try {
      if (cache) cache.put(cacheKey, JSON.stringify(record), GP_CONFIG_CACHE_TTL_SECONDS_);
    } catch (cacheWriteError) {}
    return projectCentralConfiguration_(snapshot, visibility, serviceKey, false, true);
  } catch (readError) {
    var age = cached ? now - Number(cached.fetchedAtMs) : Infinity;
    if (cached && age <= GP_CONFIG_STALE_TTL_MS_) {
      // Los parámetros pueden tolerar stale-if-error hasta 15 min.
      // El registro de endpoints deja de ser utilizable al superar 5 min.
      return projectCentralConfiguration_(cached.snapshot, visibility, serviceKey, true, age <= GP_CONFIG_FRESH_TTL_MS_);
    }
    throw readError;
  }
}

function projectCentralConfiguration_(snapshot, visibility, serviceKey, stale, routingAvailable) {
  var result = {
    status: "success",
    schemaVersion: snapshot.schemaVersion,
    revision: snapshot.revision,
    generatedAt: snapshot.generatedAt,
    stale: Boolean(stale),
    routingAvailable: visibility === "public" && Boolean(routingAvailable),
    parameters: {}
  };
  Object.keys(snapshot.parameters).forEach(function(key) {
    var item = snapshot.parameters[key];
    if (!item.enabled) return;
    if (visibility === "public" && item.visibility === "public") result.parameters[key] = item.value;
    if (visibility === "backend" && item.visibility === "backend" &&
        (item.scope === "global" || item.scope === "service:" + serviceKey)) result.parameters[key] = item.value;
  });
  if (visibility === "public") {
    result.services = routingAvailable ? snapshot.services : null;
    return result;
  }
  result.resources = {};
  Object.keys(snapshot.resources).forEach(function(key) {
    var item = snapshot.resources[key];
    if (item.enabled && item.visibility === "backend" &&
        (item.scope === "global" || item.scope === "service:" + serviceKey)) {
      result.resources[key] = {
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        expectedParentId: item.expectedParentId,
        expectedName: item.expectedName
      };
    }
  });
  // La proyección backend nunca contiene el registro de endpoints ni URLs de otros servicios.
  return result;
}

function readCentralConfigurationSnapshot_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw centralConfigurationError_("NO_ACTIVE_SPREADSHEET", "No hay una Spreadsheet activa para leer la configuración central.");
  var controlHeaders = ["control_key", "schema_version", "active_revision", "publication_state", "published_at", "updated_by", "change_reason"];
  var controlFirst = readCentralConfigurationTable_(spreadsheet, "ConfiguracionControl", controlHeaders);
  var control = resolveCentralConfigurationControl_(controlFirst.rows);
  var schemaHeaders = ["config_key", "entity_type", "value_type", "scope_allowed", "visibility_allowed", "required", "default_json", "validation_rule", "introduced_schema_version", "deprecated_schema_version", "replacement_key", "owner_service", "description"];
  var schemaTable = readCentralConfigurationTable_(spreadsheet, "ConfiguracionEsquema", schemaHeaders);
  var schema = validateCentralConfigurationSchema_(schemaTable.rows, control.schemaVersion);
  var serviceHeaders = ["config_revision", "service_key", "endpoint_url", "enabled", "contract_version", "min_client_version", "health_action", "updated_at", "updated_by", "change_reason"];
  var servicesTable = readCentralConfigurationTable_(spreadsheet, "Servicios", serviceHeaders);
  var services = validateCentralConfigurationServices_(servicesTable.rows, control.activeRevision);
  var parameterHeaders = ["config_revision", "config_key", "value_json", "value_type", "scope", "visibility", "enabled", "default_json", "validation_rule", "schema_version", "updated_at", "updated_by", "change_reason"];
  var parameterTable = readCentralConfigurationTable_(spreadsheet, "ConfiguracionParametros", parameterHeaders);
  var parameters = validateCentralConfigurationParameters_(parameterTable.rows, control.activeRevision, control.schemaVersion, schema);
  var resourceHeaders = ["config_revision", "resource_key", "resource_type", "resource_id", "scope", "visibility", "enabled", "expected_parent_id", "expected_name", "updated_at", "updated_by", "change_reason"];
  var resourceTable = readCentralConfigurationTable_(spreadsheet, "ConfiguracionRecursos", resourceHeaders);
  var resources = validateCentralConfigurationResources_(resourceTable.rows, control.activeRevision, schema);
  var controlSecond = resolveCentralConfigurationControl_(
    readCentralConfigurationTable_(spreadsheet, "ConfiguracionControl", controlHeaders).rows
  );
  if (controlSecond.activeRevision !== control.activeRevision ||
      controlSecond.schemaVersion !== control.schemaVersion ||
      controlSecond.publicationState !== "READY") {
    throw centralConfigurationError_("CONFIGURATION_REVISION_CHANGED", "La configuración cambió durante la lectura; se requiere una nueva lectura completa.");
  }
  return {
    schemaVersion: control.schemaVersion,
    revision: control.activeRevision,
    generatedAt: new Date().toISOString(),
    services: services,
    parameters: parameters,
    resources: resources
  };
}

function readCentralConfigurationTable_(spreadsheet, name, requiredHeaders) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw centralConfigurationError_("CONFIGURATION_SHEET_MISSING", "Falta una hoja requerida de configuración: " + name + ".");
  var values = sheet.getDataRange().getValues();
  if (!Array.isArray(values) || !values.length || !Array.isArray(values[0])) {
    throw centralConfigurationError_("CONFIGURATION_TABLE_EMPTY", "La tabla de configuración no tiene encabezados válidos: " + name + ".");
  }
  var headers = values[0].map(function(value) { return String(value === null || value === undefined ? "" : value).trim(); });
  var positions = {};
  headers.forEach(function(header, index) {
    if (!header) return;
    if (Object.prototype.hasOwnProperty.call(positions, header)) {
      throw centralConfigurationError_("CONFIGURATION_DUPLICATE_HEADER", "Hay encabezados duplicados en " + name + ".");
    }
    positions[header] = index;
  });
  requiredHeaders.forEach(function(header) {
    if (!Object.prototype.hasOwnProperty.call(positions, header)) {
      throw centralConfigurationError_("CONFIGURATION_HEADER_MISSING", "Falta un encabezado requerido en " + name + ": " + header + ".");
    }
  });
  var rows = [];
  values.slice(1).forEach(function(row, index) {
    if (!row.some(function(value) { return value !== "" && value !== null && value !== undefined; })) return;
    var item = { _row: index + 2 };
    requiredHeaders.forEach(function(header) { item[header] = row[positions[header]]; });
    rows.push(item);
  });
  return { headers: headers, rows: rows };
}

function resolveCentralConfigurationControl_(rows) {
  var matches = rows.filter(function(row) { return String(row.control_key || "").trim() === "CONFIGURATION_ACTIVE"; });
  if (matches.length !== 1 || rows.length !== 1) {
    throw centralConfigurationError_("CONFIGURATION_CONTROL_INVALID", "Debe existir una única fila activa de control de configuración.");
  }
  var row = matches[0], schemaVersion = Number(row.schema_version), revision = Number(row.active_revision);
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion !== GP_CONFIG_SCHEMA_VERSION_ ||
      !Number.isSafeInteger(revision) || revision < 1 || String(row.publication_state || "").trim() !== "READY") {
    throw centralConfigurationError_("CONFIGURATION_CONTROL_INVALID", "La revisión activa no está publicada o no es compatible.");
  }
  return { schemaVersion: schemaVersion, activeRevision: revision, publicationState: "READY" };
}

function validateCentralConfigurationSchema_(rows, schemaVersion) {
  var map = {};
  rows.forEach(function(row) {
    var key = String(row.config_key || "").trim();
    var entity = String(row.entity_type || "").trim();
    var owner = String(row.owner_service || "").trim().toUpperCase();
    var introduced = Number(row.introduced_schema_version);
    if (!key || !/^[a-z][a-z0-9_.-]{1,100}$/.test(key) ||
        ["parameter", "resource"].indexOf(entity) < 0 ||
        GP_CONFIG_SERVICE_KEYS_.indexOf(owner) < 0 ||
        !Number.isSafeInteger(introduced) || introduced < 1 || introduced > schemaVersion) {
      throw centralConfigurationError_("CONFIGURATION_SCHEMA_INVALID", "Hay una definición de esquema desconocida o incompatible.");
    }
    var mapKey = entity + ":" + key;
    if (map[mapKey]) throw centralConfigurationError_("CONFIGURATION_SCHEMA_DUPLICATE", "Hay claves duplicadas en ConfiguracionEsquema.");
    var required = row.required;
    if (typeof required !== "boolean") throw centralConfigurationError_("CONFIGURATION_SCHEMA_INVALID", "El campo required debe ser booleano.");
    map[mapKey] = {
      valueType: String(row.value_type || "").trim(),
      scopes: String(row.scope_allowed || "").split(/[|,]/).map(function(x) { return x.trim(); }).filter(Boolean),
      visibilities: String(row.visibility_allowed || "").split(/[|,]/).map(function(x) { return x.trim(); }).filter(Boolean),
      required: required,
      validationRule: String(row.validation_rule || "").trim(),
      owner: owner
    };
    if (entity === "parameter") {
      var known = GP_CONFIG_PARAMETER_RULES_[key];
      if (!known || map[mapKey].valueType !== known.valueType ||
          map[mapKey].scopes.indexOf(known.scope) < 0 ||
          map[mapKey].visibilities.indexOf(known.visibility) < 0 ||
          owner !== known.owner || map[mapKey].validationRule !== "enum:strict|advanced") {
        throw centralConfigurationError_("CONFIGURATION_SCHEMA_UNKNOWN_PARAMETER", "El esquema contiene un parámetro no aprobado por el código.");
      }
    }
    if (entity === "resource" && map[mapKey].valueType !== "drive_folder" && map[mapKey].valueType !== "drive_file") {
      throw centralConfigurationError_("CONFIGURATION_SCHEMA_INVALID_RESOURCE", "El tipo de recurso no está permitido.");
    }
  });
  return map;
}

function validateCentralConfigurationServices_(rows, revision) {
  var active = rows.filter(function(row) { return Number(row.config_revision) === revision; });
  var result = {};
  active.forEach(function(row) {
    var key = String(row.service_key || "").trim().toUpperCase();
    var endpoint = String(row.endpoint_url || "").trim();
    var contract = String(row.contract_version || "").trim();
    var minClient = String(row.min_client_version || "").trim();
    if (GP_CONFIG_SERVICE_KEYS_.indexOf(key) < 0 || result[key] ||
        typeof row.enabled !== "boolean" ||
        !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint) ||
        !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(contract) ||
        (minClient && !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(minClient))) {
      throw centralConfigurationError_("CONFIGURATION_SERVICE_INVALID", "El registro de servicios contiene una clave, endpoint o contrato inválido.");
    }
    result[key] = {
      endpointUrl: endpoint,
      enabled: row.enabled,
      contractVersion: contract,
      minClientVersion: minClient || null
    };
  });
  if (Object.keys(result).length !== GP_CONFIG_SERVICE_KEYS_.length ||
      GP_CONFIG_SERVICE_KEYS_.some(function(key) { return !result[key]; })) {
    throw centralConfigurationError_("CONFIGURATION_SERVICES_INCOMPLETE", "La revisión no contiene los siete servicios requeridos.");
  }
  return result;
}

function parseCentralConfigurationJson_(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw centralConfigurationError_("CONFIGURATION_VALUE_INVALID", "Valor JSON vacío o no serializado: " + label + ".");
  }
  try { return JSON.parse(value); }
  catch (error) { throw centralConfigurationError_("CONFIGURATION_VALUE_INVALID", "JSON inválido en " + label + "."); }
}

function validateCentralConfigurationParameters_(rows, revision, schemaVersion, schema) {
  var result = {};
  rows.filter(function(row) { return Number(row.config_revision) === revision; }).forEach(function(row) {
    var key = String(row.config_key || "").trim();
    var rule = GP_CONFIG_PARAMETER_RULES_[key], schemaRule = schema["parameter:" + key];
    if (!rule || !schemaRule || result[key] ||
        Number(row.schema_version) !== schemaVersion ||
        String(row.value_type || "").trim() !== rule.valueType ||
        String(row.scope || "").trim() !== rule.scope ||
        String(row.visibility || "").trim() !== rule.visibility ||
        schemaRule.owner !== rule.owner || typeof row.enabled !== "boolean") {
      throw centralConfigurationError_("CONFIGURATION_PARAMETER_INVALID", "Parámetro ausente del catálogo o incompatible: " + key + ".");
    }
    var value = parseCentralConfigurationJson_(row.value_json, key);
    var defaultValue = parseCentralConfigurationJson_(row.default_json, key + ".default");
    if (rule.values.indexOf(value) < 0 || rule.values.indexOf(defaultValue) < 0 ||
        String(row.validation_rule || "").trim() !== schemaRule.validationRule) {
      throw centralConfigurationError_("CONFIGURATION_PARAMETER_VALUE_INVALID", "El valor del parámetro no cumple su regla: " + key + ".");
    }
    result[key] = { value: value, enabled: row.enabled, scope: rule.scope, visibility: rule.visibility };
  });
  return result;
}

function validateCentralConfigurationResources_(rows, revision, schema) {
  var result = {};
  rows.filter(function(row) { return Number(row.config_revision) === revision; }).forEach(function(row) {
    var key = String(row.resource_key || "").trim();
    var type = String(row.resource_type || "").trim();
    var scope = String(row.scope || "").trim();
    var visibility = String(row.visibility || "").trim();
    var schemaRule = schema["resource:" + key];
    var owner = schemaRule && schemaRule.owner;
    var id = String(row.resource_id || "").trim();
    if (!schemaRule || result[key] ||
        ["drive_folder", "drive_file"].indexOf(type) < 0 ||
        type !== schemaRule.valueType ||
        !/^(?:global|service:[A-Z_]+)$/.test(scope) ||
        (scope !== "global" && scope !== "service:" + owner) ||
        ["backend", "admin"].indexOf(visibility) < 0 ||
        schemaRule.visibilities.indexOf(visibility) < 0 ||
        !/^[A-Za-z0-9_-]{5,200}$/.test(id) ||
        typeof row.enabled !== "boolean") {
      throw centralConfigurationError_("CONFIGURATION_RESOURCE_INVALID", "El registro de recursos contiene una clave, tipo, alcance o ID inválido.");
    }
    var parent = String(row.expected_parent_id || "").trim();
    if (parent && !/^[A-Za-z0-9_-]{5,200}$/.test(parent)) {
      throw centralConfigurationError_("CONFIGURATION_RESOURCE_INVALID", "El recurso contiene una referencia de padre inválida.");
    }
    result[key] = {
      resourceType: type,
      resourceId: id,
      scope: scope,
      visibility: visibility,
      enabled: row.enabled,
      expectedParentId: parent || null,
      expectedName: String(row.expected_name || "").trim() || null
    };
  });
  return result;
}

function centralConfigurationError_(code, message) {
  var error = new Error(message);
  error.code = code;
  return error;
}
