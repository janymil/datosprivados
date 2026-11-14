# Lista para el abogado

Lo que la auditoría legal no puede decidir sola (diseño del motor legal, §7). Un abogado
colegiado revisa cada punto contra el texto oficial; su respuesta se convierte en un
cambio legal aprobado por el fundador en `/operador/legal`, nunca en una edición directa.

Cómo se usa:

- `pnpm legal:audit` agrega aquí, bajo «Pendientes de la auditoría», las cláusulas cuyo
  significado la IA no pudo confirmar. No toca el resto del archivo.
- Al resolver un punto, marcarlo `- [x]` y anotar al lado la respuesta y el cambio
  (`lc-…`) que la aplicó.

## De la auditoría de octubre (AUDITORIA_DOCUMENTOS_LEGALES.md §7)

Citados de memoria o de fuentes secundarias, no leídos en el texto oficial:

- [ ] Ley N.° 29733, art. 14: confirmar los numerales que se citan (solo 14.1 y 14.5 están en el código).
- [ ] «Ingresos económicos» como dato sensible: la Ley (art. 2.5) los incluye y la lista del nuevo Reglamento (art. 2.6) no; hoy se tratan con cautela y una nota.
- [ ] Directiva N.° 01-2020-JUS/DGTAIPD (videovigilancia): plazos de 30 a 60 días, 30 para colegios, cartel amarillo de al menos 297 × 210 mm y aviso ampliado vienen de resúmenes de estudios; la regla de borrado en 2 días hábiles quedó fuera.
- [ ] Normas sectoriales citadas sin leer el texto oficial: Ley 26842, Ley 29414, Ley 30024, NTS 139-MINSA/2018 (RM 214-2018/MINSA; no se indican años de conservación), D. Leg. 1490, Ley 30947, Ley 29459 / DS 014-2011-SA, Ley 28044, Ley 29719, DS 001-2015-MINCETUR, DS 017-2009-MTC, Ley 28681, Ley 27157 / DS 008-2000-MTC, D. Leg. 1213, Ley 29946, Ley 26702, Ley 30822, Ley 27489, Ley 29783, Ley 31814, Ley 27693 / Ley 29038 / DS 020-2017-JUS, DS 011-2011-PCM, Opinión Consultiva 045-2021-JUS/DGTAIPD.
- [ ] Sujetos obligados ante la UIF: hoy se dice «verificar con la lista de la SBS»; confirmar qué rubros lo son.
- [ ] Conservación tributaria de 5 años (prescripción de 4 años más margen): confirmar.
- [ ] Antes de publicar, revisar las cláusulas de datos sensibles y de menores, sobre todo en salud y educación.

## Pendientes de la auditoría
- [ ] 41c17946d063 · politica.2.bancos-finalidades · las dos pasadas ven respaldo parcial
- [ ] 39f4d6902b4f · politica.2.bancos-finalidades · las dos pasadas ven respaldo parcial
- [ ] 4fe8683b834a · politica.4.base-legal · las dos pasadas ven respaldo parcial
- [ ] 07381ee6f609 · politica.6-transferencia.si · las dos pasadas ven respaldo parcial
- [ ] bd6054700b29 · politica.6-transferencia.si · las dos pasadas ven respaldo parcial
- [ ] 1f363302d3be · politica.7.derechos-arco · las dos pasadas ven respaldo parcial
- [ ] df61db78fce5 · politica.7.derechos-arco · las pasadas no coinciden
- [ ] b3689f8b98cc · politica.8-automatizado.si · las dos pasadas ven respaldo parcial
- [ ] b6f1d01a36a5 · politica.8-automatizado.si · las dos pasadas ven respaldo parcial
- [ ] 16f2af6bb191 · politica.8-automatizado.no · las dos pasadas ven respaldo parcial
- [ ] 5c4c4bbeb693 · politica.8-automatizado.no · las dos pasadas ven respaldo parcial
- [ ] f156b857f919 · politica.9.seguridad-incidentes · las dos pasadas ven respaldo parcial
- [ ] 25e8ef9e07d8 · politica.10-sensibles.si · las dos pasadas ven respaldo parcial
- [ ] bdb0f9a3308d · politica.10-sensibles.si · las dos pasadas ven respaldo parcial
- [ ] 51808d9a6c92 · politica.10-sensibles.no · las dos pasadas ven respaldo parcial
- [ ] f4f898b3c3cb · politica.10-menores.si · las pasadas no coinciden
- [ ] 76dbea4590e2 · politica.11.cookies-vigencia · las pasadas no coinciden
- [ ] 893653cbd861 · politica.11.cookies-vigencia · las pasadas no coinciden
- [ ] f92ebb3e525c · cookies.1.que-son · las pasadas no coinciden
- [ ] 9aa46bff244e · consentimiento.b.whatsapp · las dos pasadas ven respaldo parcial
- [ ] c4667914fdff · consentimiento.d.encabezado · las dos pasadas ven respaldo parcial
- [ ] 7b1370e2ab7a · consentimiento.d.encabezado · las dos pasadas ven respaldo parcial
- [ ] 32e68ca5cae1 · consentimiento.f.menores · las pasadas no coinciden
- [ ] 4aa45dd3a336 · consentimiento.f.menores · las dos pasadas ven respaldo parcial
- [ ] 8a771b4d8e30 · consentimiento.nota.borrador · las pasadas no coinciden
- [ ] 71d68c381a31 · seguridad.1.objeto · las dos pasadas ven respaldo parcial
- [ ] 9b9d0d858eb9 · seguridad.1.objeto · las dos pasadas ven respaldo parcial
- [ ] 73350b803d23 · seguridad.3.gobernanza · las dos pasadas ven respaldo parcial
- [ ] 74779b13a142 · seguridad.3.gobernanza · las dos pasadas ven respaldo parcial
- [ ] 5cf169d17317 · seguridad.4.control-accesos · las dos pasadas ven respaldo parcial
- [ ] 1694ee1821ea · seguridad.5.respaldos-cifrado · las pasadas no coinciden
- [ ] 9892ac87d36b · seguridad.6.incidentes-48h · las dos pasadas ven respaldo parcial
- [ ] ce96ffc78703 · seguridad.7.conservacion-supresion · las pasadas no coinciden
- [ ] bfa81d190d3a · seguridad.7.conservacion-supresion · las pasadas no coinciden
- [ ] 2cc2ea8dd8a4 · retencion.2.plazos-bancos · las dos pasadas ven respaldo parcial
- [ ] e19627f0e7bc · retencion.2.plazos-bancos · las dos pasadas ven respaldo parcial
- [ ] 1b17c8e80dbb · retencion.4.bloqueo-eliminacion · las dos pasadas ven respaldo parcial
- [ ] 60967f456157 · encargo.a.clausula-modelo · las dos pasadas ven respaldo parcial
- [ ] ad27de758018 · encargo.a.clausula-modelo · las dos pasadas ven respaldo parcial
- [ ] 59c235c70c46 · encargo.b-anexo.proveedores · las dos pasadas ven respaldo parcial
- [ ] 8026ca48032c · encargo.b-anexo.proveedores · las pasadas no coinciden
- [ ] 4ba4781a2395 · encargo.c.transferencia-internacional · las dos pasadas ven respaldo parcial
- [ ] 938727f94ec2 · encargo.c.transferencia-internacional · las dos pasadas ven respaldo parcial
- [ ] 1ecd02e400e8 · encargo.d.checklist-firmas · las dos pasadas ven respaldo parcial
- [ ] 0ea03f540468 · encargo.d.checklist-firmas · las dos pasadas ven respaldo parcial
- [ ] c2a868b70111 · clausulas.a.confidencialidad · las dos pasadas ven respaldo parcial
- [ ] 00e2b06019a4 · clausulas.a.confidencialidad · las dos pasadas ven respaldo parcial
- [ ] 3dad7269c2c6 · clausulas.b.encargo-proveedores · las pasadas no coinciden
- [ ] 25fe79c2a7ed · clausulas.b.encargo-proveedores · las dos pasadas ven respaldo parcial
- [ ] 42fc9223eb3e · clausulas.d.acta-odp · las dos pasadas ven respaldo parcial
- [ ] 19230d0f163a · clausulas.d.acta-odp · las dos pasadas ven respaldo parcial
- [ ] ebbc54074158 · eipd.0.cuando-corresponde · las dos pasadas ven respaldo parcial
- [ ] 72c4078c30b7 · eipd.0.cuando-corresponde · las dos pasadas ven respaldo parcial
- [ ] d7db0c85bef0 · eipd.4.mitigacion · las dos pasadas ven respaldo parcial
- [ ] 8b7ba512450d · eipd.4.mitigacion · las dos pasadas ven respaldo parcial
- [ ] 0284eb7b226f · trabajadores.a.aviso-personal · la cita de la IA no está en el artículo
- [ ] 66026be67e04 · trabajadores.a.aviso-personal · las dos pasadas ven respaldo parcial
- [ ] 8962f5572b13 · trabajadores.b.sensibles-personal · las dos pasadas ven respaldo parcial
- [ ] c32cb6c8f17f · trabajadores.b.sensibles-personal · las dos pasadas ven respaldo parcial
- [ ] 0bbfbba2aa9f · trabajadores.c.postulantes · las pasadas no coinciden
- [ ] c9cf36febda7 · trabajadores.c.postulantes · las pasadas no coinciden
- [ ] d15de08d3773 · trabajadores.e.correo-equipos · las dos pasadas ven respaldo parcial
- [ ] 287ec9392efa · trabajadores.e.correo-equipos · las dos pasadas ven respaldo parcial
- [ ] c343620116d4 · trabajadores.f.capacitacion · las dos pasadas ven respaldo parcial
- [ ] 269256ddb8f7 · arco.1.objeto-responsable · las dos pasadas ven respaldo parcial
- [ ] 155001c6ab4a · arco.1.objeto-responsable · la cita de la IA no está en el artículo
- [ ] aeb9bfdb44f7 · arco.2.canales · las dos pasadas ven respaldo parcial
- [ ] 016e7ba5535f · arco.2.canales · las dos pasadas ven respaldo parcial
- [ ] 0cc85f31fc19 · arco.3.plazos · las dos pasadas ven respaldo parcial
- [ ] 147407ed118f · arco.4.flujo · las dos pasadas ven respaldo parcial
- [ ] 5029a710751c · arco.5.contenido-respuesta · las dos pasadas ven respaldo parcial
- [ ] 3901e5bcb956 · arco.6.respuesta-negativa · las dos pasadas ven respaldo parcial
- [ ] 8a82b49e0584 · arco.7.encargados · las dos pasadas ven respaldo parcial
- [ ] 65947fd2797a · sectorial.3.procedimientos · las dos pasadas ven respaldo parcial
- [ ] c477dc55bea5 · sectorial.7-herramientas.tabla · las dos pasadas ven respaldo parcial
- [ ] 846eb35a44b3 · sectorial.7-herramientas.tabla · las dos pasadas ven respaldo parcial
- [ ] c1747d4946ea · sectorial.8.revision-mensual · las pasadas no coinciden
- [ ] 278f25c973a7 · sectorial.8.revision-mensual · las pasadas no coinciden
