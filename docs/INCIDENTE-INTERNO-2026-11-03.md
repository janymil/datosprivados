# Registro de incidente interno — 2026-11-03

> Documento para el abogado y para la auditoría. Se escribe **antes** de decidir si hay
> algo que notificar: si no hay nada, esto es la prueba de que se evaluó; si hay algo, es
> el punto de partida del plazo. No sustituye a la evaluación jurídica.

## Qué pasó

Durante la auditoría de puesta en producción se encontraron dos fallos de configuración
en el servidor del **preview** (`datosprivados.registio.app`, una sola instancia, uso
interno, sin clientes de pago):

1. **La base de datos y sus respaldos eran legibles por cualquier usuario de la máquina.**
   `data/` estaba en `755` y `datosprivados.db` en `644`; comprobado con
   `sudo -u nobody test -r data/datosprivados.db` → **acceso concedido**. Los 130
   respaldos también estaban en `644`, aunque dentro de un directorio `700`.
2. **El acceso SSH por contraseña estaba abierto**, aunque la configuración pareciera
   cerrarlo: `sshd_config` y `60-cloudimg-settings.conf` decían
   `PasswordAuthentication no`, pero `50-cloud-init.conf` dice `yes` y se incluye antes —
   sshd se queda con el **primer** valor, así que el efectivo era
   `passwordauthentication yes` (confirmado con `sshd -T`). La cuenta `jan` tenía
   contraseña utilizable. `fail2ban` no está instalado.

Los dos fallos se combinaban: una contraseña acertada por fuerza bruta daba lectura
directa de la base.

## Ventana de exposición

Desde la creación de la base en este servidor (máquina del 26/10/2026; preview publicado
el 31/10/2026) hasta el **2026-11-03 21:20 UTC**, cuando se corrigieron los permisos y la
configuración de SSH.

## Qué datos había dentro

Consultado el 2026-11-03 con la base en solo lectura:

| Tabla | Contenido |
|---|---|
| `companies` | 1: `casa-verde` (Casa Verde Perú S.A.C.), `billing_status = demo` |
| `users` | 1: `demo@datosprivados.pe` |
| `arco_requests` | 3: `ARCO-2026-0010/0011/0012` con nombre, correo y DNI **con aspecto de datos de siembra** (`mf.quispe@gmail.com`, `jramos@outlook.com`, `aptorres@yahoo.com`) |
| `payments` | 0 |
| `incidents` | 1 |

**No había datos de clientes de pago**: la cuenta demo y tres solicitudes ARCO creadas
durante pruebas. Advertencia honesta: si alguna de esas tres solicitudes fuera de una
persona real (por ejemplo, una prueba con datos reales), habría datos personales dentro y
la evaluación cambia; hay que confirmarlo con quien las creó.

## Indicios de acceso

Lo que se pudo comprobar (y lo que no):

- `last`: **solo** accesos correctos de `root` desde una única IP, desde la creación de
  la máquina. Ningún acceso correcto de `ubuntu`, `jan` ni `postgres`.
- `passwd -S`: `ubuntu` y `postgres` tienen la contraseña bloqueada; `jan` la tiene
  utilizable, pero nunca inició sesión.
- `/var/log/auth.log`: **19 885** líneas «Failed password» — intentos fallidos de
  diccionario contra `root`, `ubuntu`, `ftp1` y otros nombres.
- **No se puede descartar** una lectura local: no hay `auditd`, y el `atime` de la base no
  sirve porque la aplicación la lee continuamente. Tampoco hay `fail2ban` que aporte
  registro de bloqueos.

Conclusión operativa: **no hay indicio de acceso no autorizado**, y el conjunto de datos
expuesto era de demostración, no de clientes. No es prueba de inexistencia.

## Qué se corrigió

| Acción | Verificación |
|---|---|
| `data/` a `700`; base, `-wal` y `-shm` a `600` | `sudo -u nobody test -r` → denegado; `/api/health` → 200 |
| 130 respaldos a `600` | `ls -l` → todos `-rw-------` |
| `backup-db.mjs` hace `chmod 600` del respaldo y su `.sha256` al escribirlos | prueba en `test/backup-crypto.test.ts` |
| `/etc/ssh/sshd_config.d/00-datosprivados.conf`: `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitRootLogin prohibit-password` | `sshd -t` OK y `sshd -T` → `passwordauthentication no`, claves intactas |
| Registro de ambos fallos con severidad S1/S3 | `docs/DEFECTS.md` |

Copias previas de lo tocado: `/root/sshd_config.bak-*` y `/root/datosprivados-vhost.bak-*`.

## Decisiones pendientes (propietario / abogado)

1. **¿Hay que notificar a la ANPD?** Con datos de demostración y sin indicio de acceso, la
   valoración preliminar es que **no** se configura incidente notificable; la decisión es
   jurídica y conviene dejarla por escrito. Material: este documento.
2. **¿Se conservan las tres solicitudes ARCO de prueba?** Si alguna es de una persona real,
   hay que tratarla como dato personal y valorar su borrado.
3. **`fail2ban`**: instalarlo y dejar el jail `sshd` activo (hoy no está instalado).
4. **Cuenta `jan`**: confirmar si sigue siendo necesaria; si no, darla de baja.
5. **Producción**: arrancar con estos valores desde el primer día. Están escritos en
   `docs/RUNBOOK.md` («Acceso al servidor (SSH)» y «Respaldos»).
