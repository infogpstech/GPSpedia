// =================================================================
// --- GLOBAL CONSTANTS & CONFIG ---
// =================================================================
const SPREADSHEET_ID = "1jEdC2NMc2a5F36xE2MJfgxMZiZFVfeDqnCdVizNGIMo";
const DRIVE_FOLDER_ID = '1-8QqhS-wtEFFwyBG8CmnEOp5i8rxSM-2';

const SHEET_NAMES = {
  CORTES: "Cortes",
  USERS: "Users",
  FEEDBACKS: "Feedbacks",
  TUTORIALES: "Tutorial",
  RELAY: "Configuración del Relay"
};

const ROLE_HIERARCHY = {
    'Desarrollador': 4,
    'Gefe': 3,
    'Supervisor': 2,
    'Tecnico': 1,
    'Tecnico_Exterior': 1
};

// =================================================================
// --- MAIN ROUTER & HELPERS ---
// =================================================================
function doPost(e) {
  let request;
  try {
    request = JSON.parse(e.postData.contents);
    if (!request.action) throw new Error("Action not specified.");
    Logger.log(`Received action: ${request.action}`);

    // Action router
    switch (request.action) {
      case 'login': return handleLogin(request.payload);
      case 'getCatalogData': return handleGetCatalogData();
      case 'recordLike': return handleRecordLike(request.payload);
      case 'addCorte': return handleAddCorte(request.payload);
      case 'getUsers': return handleGetUsers(request.payload);
      case 'createUser': return handleCreateUser(request.payload);
      case 'updateUser': return handleUpdateUser(request.payload);
      case 'deleteUser': return handleDeleteUser(request.payload);
      case 'changePassword': return handleChangePassword(request.payload);
      default: throw new Error(`Invalid action: ${request.action}`);
    }
  } catch (error) {
    return handleError(error, `doPost router (action: ${request ? request.action : 'unknown'})`);
  }
}

function jsonResponse(data, statusCode = 200) {
  const output = JSON.stringify(data);
  const textOutput = ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  // CORS Header: Allow all origins. Crucial for local development and deployment.
  textOutput.setHeader('Access-Control-Allow-Origin', '*');
  // It's good practice to also allow methods and headers for more complex requests.
  textOutput.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  textOutput.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return textOutput;
}

function handleError(error, functionName = 'Unknown') {
  Logger.log(`Error in ${functionName}: ${error.stack}`);
  return jsonResponse({
    status: 'error',
    message: `Server error in ${functionName}.`,
    details: {
      name: error.name,
      message: error.message,
    }
  }, 500);
}

function getSheetDataAsObjects(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  const [headers, ...rows] = sheet.getDataRange().getValues();
  const camelCaseHeaders = headers.map(header =>
    header.trim().replace(/[^a-zA-Z0-9]+(.)?/g, (m, c) => c ? c.toUpperCase() : '').replace(/^./, m => m.toLowerCase())
  );
  return rows.map(row =>
    camelCaseHeaders.reduce((obj, header, index) => {
      obj[header] = row[index];
      return obj;
    }, {})
  );
}


// =================================================================
// --- PHASE 1 ACTION HANDLERS ---
// =================================================================
function handleLogin(payload) {
    const { username, password } = payload;
    if (!username || !password) {
        throw new Error("Username and password are required.");
    }

    const users = getSheetDataAsObjects(SHEET_NAMES.USERS);
    const user = users.find(u => u.nombreUsuario === username && u.password === password);

    if (user) {
        // Exclude password from the returned user object
        const { password, ...safeUser } = user;
        return jsonResponse({ status: 'success', user: safeUser });
    } else {
        throw new Error("Invalid username or password.");
    }
}

function handleGetCatalogData() {
  const cortes = getSheetDataAsObjects(SHEET_NAMES.CORTES);
  const tutoriales = getSheetDataAsObjects(SHEET_NAMES.TUTORIALES);
  const relay = getSheetDataAsObjects(SHEET_NAMES.RELAY);

  const responseData = {
    cortes: cortes,
    tutoriales: tutoriales,
    relay: relay
  };

  return jsonResponse({ status: 'success', data: responseData });
}

function handleRecordLike(payload) {
    const { vehicleId, userName } = payload;
    if (!vehicleId || !userName) {
        throw new Error("Vehicle ID and User Name are required to record a like.");
    }

    const cortesSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.CORTES);
    const [headers, ...rows] = cortesSheet.getDataRange().getValues();

    const idColIndex = headers.indexOf("ID");
    const utilColIndex = headers.indexOf("Util");

    if (idColIndex === -1 || utilColIndex === -1) {
        throw new Error("Could not find required columns ('ID' or 'Util') in the sheet.");
    }

    const rowIndex = rows.findIndex(row => row[idColIndex].toString() === vehicleId.toString());

    if (rowIndex === -1) {
        throw new Error(`Vehicle with ID ${vehicleId} not found.`);
    }

    const sheetRowIndex = rowIndex + 2; // +1 for 1-based index, +1 for header row
    const utilCell = cortesSheet.getRange(sheetRowIndex, utilColIndex + 1);
    let utilValue = utilCell.getValue().toString();

    // Prevent duplicate likes
    const usersWhoLiked = utilValue.split(',').map(u => u.trim()).filter(Boolean);
    if (usersWhoLiked.includes(userName)) {
        return jsonResponse({ status: 'success', message: 'User has already liked this item.' });
    }

    usersWhoLiked.push(userName);
    utilCell.setValue(usersWhoLiked.join(', '));

    return jsonResponse({ status: 'success', message: 'Like recorded successfully.' });
}

function handleAddCorte(payload) {
  const { vehicleInfo, additionalInfo, files } = payload;
  const cortesSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.CORTES);

  // 1. Handle file uploads and get URLs
  const fileUrls = {};
  for (const key in files) {
    if (files[key]) {
      const file = files[key];
      const fileName = `${vehicleInfo.marca}_${vehicleInfo.modelo}_${key}_${new Date().getTime()}`;
      fileUrls[key] = uploadFileToDrive(file.data, file.mimeType, fileName);
    }
  }

  // 2. Prepare data for the new row
  const newRowData = {
    'categoria': vehicleInfo.categoria,
    'imagenDelVehiculo': fileUrls.imagenVehiculo || '',
    'marca': vehicleInfo.marca,
    'modelo': vehicleInfo.modelo,
    'tipoDeEncendido': vehicleInfo.tipoEncendido,
    'anoGeneracion': vehicleInfo.anio,
    'tipoDeCorte': additionalInfo.nuevoCorte.tipo,
    'descripcionDelCorte': additionalInfo.nuevoCorte.descripcion,
    'imagenDelCorte': fileUrls.imagenCorte || '',
    'apertura': additionalInfo.apertura,
    'imagenDeLaApertura': fileUrls.imagenApertura || '',
    'notaImportante': additionalInfo.notas,
    'cablesDeAlimentacion': additionalInfo.alimentacion,
    'imagenDeLosCablesDeAlimentacion': fileUrls.imagenAlimentacion || '',
    'colaborador': vehicleInfo.colaborador,
  };

  // 3. Get headers and build the row in the correct order
  const headers = cortesSheet.getRange(1, 1, 1, cortesSheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => {
      const camelCaseHeader = header.trim().replace(/[^a-zA-Z0-9]+(.)?/g, (m, c) => c ? c.toUpperCase() : '').replace(/^./, m => m.toLowerCase());
      return newRowData[camelCaseHeader] || ''; // Use empty string for missing data
  });

  // 4. Append the new row to the sheet
  cortesSheet.appendRow(newRow);

  return jsonResponse({ status: 'success', message: 'Nuevo corte agregado exitosamente.' });
}

// Helper function to upload a base64 encoded file to Drive
function uploadFileToDrive(base64Data, mimeType, fileName) {
  try {
    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    Logger.log('Error uploading file: ' + e.toString());
    return ''; // Return empty string on error
  }
}


// =================================================================
// --- PHASE 2: USER MANAGEMENT HANDLERS ---
// =================================================================
function handleGetUsers(payload) {
    const { privilegios: requesterRole } = payload;
    const users = getSheetDataAsObjects(SHEET_NAMES.USERS);

    const filteredUsers = users.filter(user => {
        const userRole = user.privilegios;
        if (!userRole) return false; // Skip users without a role

        if (requesterRole === 'Desarrollador') return true;
        if (requesterRole === 'Gefe') return userRole !== 'Desarrollador' && userRole !== 'Tecnico_Exterior';
        if (requesterRole === 'Supervisor') return userRole === 'Tecnico';
        return false;
    });

    const safeUsers = filteredUsers.map(({ password, ...safeData }) => safeData);
    return jsonResponse({ status: 'success', users: safeUsers });
}

function handleCreateUser(payload) {
    const { newUser, creatorRole } = payload;
    const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
    const headers = usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getValues()[0];
    const users = getSheetDataAsObjects(SHEET_NAMES.USERS);

    // Permission check
    if (ROLE_HIERARCHY[creatorRole] < ROLE_HIERARCHY[newUser.privilegios]) {
        throw new Error("You do not have permission to create a user with this role.");
    }
    if (creatorRole !== 'Desarrollador' && newUser.privilegios === 'Tecnico_Exterior') {
        throw new Error("Only Developers can create 'Tecnico_Exterior' users.");
    }

    const newUsername = generateUsername(newUser.nombre, users.map(u => u.nombreUsuario));
    if (!newUsername) throw new Error("Could not generate a unique username.");

    const newRow = headers.map(header => {
        const key = header.trim();
        if (key === 'Nombre_Usuario') return newUsername;
        if (key === 'Nombre') return newUser.nombre;
        if (key === 'Password') return newUser.password; // In a real app, hash this!
        if (key === 'Privilegios') return newUser.privilegios;
        return ''; // Default for other columns like ID, SessionToken etc.
    });

    usersSheet.appendRow(newRow);
    return jsonResponse({ status: 'success', message: 'User created successfully.' });
}

function handleUpdateUser(payload) {
    const { userId, updates, updaterRole } = payload;
    const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
    const [headers, ...rows] = usersSheet.getDataRange().getValues();

    const idColIndex = headers.indexOf("ID");
    const roleColIndex = headers.indexOf("Privilegios");

    const rowIndex = rows.findIndex(row => row[idColIndex].toString() === userId.toString());

    if (rowIndex === -1) throw new Error('User not found.');

    const userToUpdateRole = rows[rowIndex][roleColIndex];

    // --- Permission Checks ---
    const updaterLevel = ROLE_HIERARCHY[updaterRole];
    const userToUpdateLevel = ROLE_HIERARCHY[userToUpdateRole];

    if (updaterLevel <= userToUpdateLevel) {
        // Gefe can't edit other Gefe, Supervisor can't edit Supervisor, etc.
        throw new Error("Permission denied: Cannot edit users of the same or higher role.");
    }

    if (userToUpdateRole === 'Tecnico_Exterior' && updaterRole !== 'Desarrollador') {
        throw new Error("Permission denied: Only a Developer can edit a Tecnico_Exterior.");
    }
    // --- End of Permission Checks ---


    headers.forEach((header, index) => {
        const key = header.trim().replace(/[^a-zA-Z0-9]+(.)?/g, (m, c) => c ? c.toUpperCase() : '').replace(/^./, m => m.toLowerCase());
        if (updates.hasOwnProperty(key) && key !== 'id') { // Don't allow changing the ID
            // If updating the role, perform another permission check
            if (key === 'privilegios' && ROLE_HIERARCHY[updaterRole] < ROLE_HIERARCHY[updates[key]]) {
                 throw new Error(`Permission denied: Cannot assign a role higher than your own.`);
            }
            usersSheet.getRange(rowIndex + 2, index + 1).setValue(updates[key]);
        }
    });

    return jsonResponse({ status: 'success', message: 'User updated successfully.' });
}

function handleDeleteUser(payload) {
    const { userId, deleterRole } = payload;
    const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
    const [headers, ...rows] = usersSheet.getDataRange().getValues();
    const idColIndex = headers.indexOf("ID");
    const roleColIndex = headers.indexOf("Privilegios");
    const rowIndex = rows.findIndex(row => row[idColIndex].toString() === userId.toString());

    if (rowIndex === -1) throw new Error('User not found.');

    const userToDeleteRole = rows[rowIndex][roleColIndex];

    // Permission Check
    if (ROLE_HIERARCHY[deleterRole] <= ROLE_HIERARCHY[userToDeleteRole]) {
         throw new Error("You do not have permission to delete a user with this role or higher.");
    }

    usersSheet.deleteRow(rowIndex + 2); // +2 because sheet rows are 1-based and we have a header row
    return jsonResponse({ status: 'success', message: 'User deleted successfully.' });
}

function handleChangePassword(payload) {
    const { userId, currentPassword, newPassword } = payload;

    if (!userId || !currentPassword || !newPassword) {
        throw new Error("Missing required fields for password change.");
    }

    const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
    const [headers, ...rows] = usersSheet.getDataRange().getValues();

    const idColIndex = headers.indexOf("ID");
    const passwordColIndex = headers.indexOf("Password");

    const rowIndex = rows.findIndex(row => row[idColIndex].toString() === userId.toString());

    if (rowIndex === -1) {
        throw new Error('User not found.');
    }

    const storedPassword = rows[rowIndex][passwordColIndex];

    if (storedPassword !== currentPassword) {
        throw new Error('Incorrect current password.');
    }

    // Update the password in the sheet
    usersSheet.getRange(rowIndex + 2, passwordColIndex + 1).setValue(newPassword);

    return jsonResponse({ status: 'success', message: 'Password updated successfully.' });
}

function generateUsername(nombre, existingUsernames) {
    if (!nombre) return null;
    const parts = nombre.toLowerCase().split(' ');
    if (parts.length < 2) return null;

    const firstName = parts[0];
    const lastName = parts[1];

    let username = `${firstName.charAt(0)}_${lastName}`;

    // Handle collisions
    let counter = 1;
    let originalUsername = username;
    while(existingUsernames.includes(username)) {
        username = `${originalUsername}${counter}`;
        counter++;
    }

    return username;
}
