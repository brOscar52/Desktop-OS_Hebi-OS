# Terminal

La **Terminal** proporciona una consola de comandos interactiva inspirada en PowerShell para interactuar directamente con el sistema de archivos de **hebi OS**.

## Comandos principales

- `help`: Muestra la lista de todos los comandos y alias disponibles.
- `ls` / `dir`: Lista los archivos y subcarpetas del directorio de trabajo actual. Usa `ls -l` para ver detalles.
- `cd <ruta>`: Cambia el directorio de trabajo (soporta rutas absolutas, relativas y `~`).
- `pwd`: Muestra la ruta completa del directorio actual.
- `mkdir [-p] <nombre>` / `md`: Crea una carpeta nueva.
- `touch <archivo>`: Crea un archivo vacío o actualiza su marca temporal.
- `cat <archivo>` / `type`: Imprime el contenido de un archivo de texto en la consola.
- `echo <texto> [> o >> archivo]`: Muestra texto o redirige la salida para escribir o anexar en un archivo.
- `rm [-r] <archivo>` / `del`: Envía archivos o carpetas a la Papelera de reciclaje.
- `mv <origen> <destino>` / `move`: Mueve o renombra archivos y carpetas.
- `cp [-r] <origen> <destino>` / `copy`: Copia archivos o árboles de directorios.
- `tree`: Imprime una vista jerárquica del árbol de carpetas.
- `open <archivo>` / `start`: Abre el archivo con su aplicación asociada en el sistema.
- `clear` / `cls`: Limpia la pantalla de la terminal.
- `history`: Muestra el historial de comandos ejecutados en la sesión.

## Productividad

- **Autocompletado con Tab:** Pulsa la tecla `Tab` para autocompletar nombres de archivos y rutas automáticamente.
- **Historial con flechas:** Usa las flechas `Arriba` y `Abajo` para navegar entre los comandos previos.
- **Encadenamiento:** Puedes concatenar varios comandos en una sola línea utilizando `&&` o `;`.
