const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');

test('El sistema de encriptación debe generar hashes seguros', async (t) => {
    const plainPassword = 'mi_clave_secreta123!';
    const hash = await bcrypt.hash(plainPassword, 10);
    
    assert.ok(hash, 'El hash no debe estar vacío');
    
    assert.notStrictEqual(plainPassword, hash, 'El hash no puede ser igual a la clave plana');
    
    const isValid = await bcrypt.compare(plainPassword, hash);
    assert.strictEqual(isValid, true, 'Bcrypt debe validar el hash correctamente');
});