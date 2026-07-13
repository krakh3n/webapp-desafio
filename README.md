# WebApp Secure Integration - MVP

## Descripción

Solución mínima de integración operativa que despliega una aplicación web segura utilizando contenedores. Demuestra la orquestación de un Frontend (Nginx), un Backend (Node.js/Express) y un motor de Base de Datos relacional (SQL Server 2022), enfocándose en la seguridad de las comunicaciones, el ciclo de vida de los datos y la automatización mediante CI/CD.

## Requisitos Previos

* Docker y Docker Compose (v2) instalados.
* Puertos locales `80`, `443`, `3000` y `1433` disponibles.
* Git (para clonar y empujar al repositorio).

## Instrucciones de Ejecución

1. **Clonar el repositorio y preparar el entorno:**

   Clonar el proyecto y asegurarse de que el archivo `.env` se encuentre en la raíz con las credenciales de entorno. 
   Puedes usar `.env.example` como base.

2. **Levantar la infraestructura:**

   Ejecutar el siguiente comando en la raíz del proyecto:
   ```bash
   docker compose up -d --build

3. **Acceso a la aplicación:**

    Frontend (HTTPS forzado): https://localhost

    `Al ingresar por primera vez, el navegador advertirá sobre el certificado autofirmado. Se debe aceptar el riesgo para acceder al entorno de desarrollo.`

    Credenciales por defecto: Usuario: `admin` | Password: `admin` (El sistema obligará a un cambio de clave inmediato).

4. **Endpoint Habilitados:**

    1. **Health:**
    CMD o POSTMAN: 
    ```bash
    curl.exe -k --location "https://localhost/api/health" -H "Content-Type: application/json"
    ```
    Navegador: 
    ```bash
    https://localhost/api/health
    ```

    2. **Token:** 
    CMD o POSTMAN: 
    ```bash
    curl.exe -k -X POST https://localhost/api/login -H "Content-Type: application/json" -d "{\"username\":\"admin\", \"password\":\"PASSWORD\"}"
    ```
    Navegador: 
    ```bash
    https://localhost
    ```
    3. **Dashboard:**
    CMD o POSTMAN: 
    ```bash
    curl.exe -k --location "https://localhost/api/dashboard" -H "Content-Type: application/json" --header "Authorization: Bearer TOKEN"
    ```
    Navegador: 
    ```bash
    https://localhost/
    ```

## Supuestos y Decisiones Tomadas:

**Arquitectura de red:**
     Se configuró una red privada en Docker (secure-network). El backend y la base de datos no exponen puertos al exterior (excepto el 1433 local para debug). Todo el tráfico externo entra exclusivamente por el proxy reverso Nginx.

**Seguridad de Base de Datos:**
     Se aplica el principio de menor privilegio. Se utiliza un contenedor efímero (db-init) para ejecutar el script SQL que inicializa las tablas y crea el usuario limitado apidemo, evitando que la API se conecte como sa(sysadmin).

**Seguridad de Aplicación:**
     Mínima exposición de datos sin token. Requiere cambio de clave de forma predeterminada. Portal de Login. Registro de accesos.

**Testing:**
     Se incluye un test de funcionamiento de encriptación.

**CI/CD:**
     Se bloqueo deploy a rama Main. Se estableció un flujo GitFlow simplificado. El pipeline de GitHub Actions se dispara en develop, corre análisis estático, pruebas unitarias y validación de contenedores. Si es exitoso, promueve automáticamente a main y genera un Release.

## Límites Conocidos y Problemas Pendientes

**Certificados:**
     Se utilizan certificados SSL/TLS autofirmados, aptos solo para desarrollo/testing.

**Persistencia de Logs:**
     Actualmente, Winston escribe los logs del backend dentro del volumen efímero del contenedor.

**Estado en Memoria:**
     El contador de usuarios activos reside en la memoria de Node.js, lo que impide escalar el backend horizontalmente de forma directa.