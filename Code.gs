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
      default: throw new Error(`Invalid action: ${request.action}`);
    }
  } catch (error) {
    return handleError(error, `doPost router (action: ${request ? request.action : 'unknown'})`);
  }
}
function jsonResponse(data, statusCode = 200) { /* ... same as before ... */ }
function handleError(error, functionName = 'Unknown') { /* ... same as before ... */ }
function getSheetDataAsObjects(sheetName) { /* ... same as before ... */ }

// =================================================================
// --- PHASE 1 ACTION HANDLERS ---
// =================================================================
function handleLogin(payload) {
    const { username, password } = payload;
    if (!username || !password) return jsonResponse({ status: 'error', message: 'Username and password required.' }, 400);
    const mockUser = {
        nombre: "Desarrollador de Pruebas",
        nombreUsuario: username,
        privilegios: "Desarrollador",
        telefono: "123456789",
        correoElectronico: "dev@test.com"
    };
    return jsonResponse({ status: 'success', user: mockUser });
}
function handleGetCatalogData() { /* ... same as before ... */ }
function handleRecordLike(payload) { /* ... same as before ... */ }
function handleAddCorte(payload) { /* ... same as before ... */ }


// =================================================================
// --- PHASE 2: USER MANAGEMENT HANDLERS ---
// =================================================================
function handleGetUsers(payload) {
    const { privilegios: requesterRole } = payload;
    const users = getSheetDataAsObjects(SHEET_NAMES.USERS);

    const filteredUsers = users.filter(user => {
        if (requesterRole === 'Desarrollador') return true;
        if (requesterRole === 'Gefe') return user.privilegios !== 'Desarrollador' && user.privilegios !== 'Tecnico_Exterior';
        if (requesterRole === 'Supervisor') return user.privilegios === 'Tecnico';
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
    const rowIndex = rows.findIndex(row => row[idColIndex].toString() === userId.toString());

    if (rowIndex === -1) throw new Error('User not found.');

    // Permission checks would go here

    headers.forEach((header, index) => {
        const key = header.trim().replace(/[^a-zA-Z0-9]+(.)?/g, (m, c) => c ? c.toUpperCase() : '').replace(/^./, m => m.toLowerCase());
        if (updates.hasOwnProperty(key)) {
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

    usersSheet.deleteRow(rowIndex + 2);
    return jsonResponse({ status: 'success', message: 'User deleted successfully.' });
}

function generateUsername(nombre, existingUsernames) {
    // ... same as before ...
}
