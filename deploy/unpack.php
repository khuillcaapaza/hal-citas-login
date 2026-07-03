<?php
declare(strict_types=1);

// Extractor de site.zip para el frontend estático (Next export) por SFTP.
// Sube 1 zip (fiable, atómico) y se extrae aqui con PHP, evitando subir miles
// de archivos pequenos por SFTP (que dejaban chunks faltantes -> 404).
// El token __UNPACK_TOKEN__ se sustituye en CI. Se autoborra tras extraer.
$expected = '__UNPACK_TOKEN__';
$token = $_GET['token'] ?? '';
header('Content-Type: text/plain; charset=utf-8');

if (!hash_equals($expected, (string) $token)) {
    http_response_code(403);
    exit('forbidden');
}

if (!class_exists('ZipArchive')) {
    http_response_code(500);
    exit('ZipArchive no disponible');
}

$zipPath = __DIR__ . '/site.zip';
$target  = __DIR__; // public_html (raiz del dominio)

if (!is_file($zipPath)) {
    http_response_code(500);
    exit('site.zip no encontrado en ' . __DIR__);
}

$za = new ZipArchive();
if ($za->open($zipPath) !== true) {
    http_response_code(500);
    exit('no se pudo abrir el zip');
}

$written = 0;
$errors  = 0;
for ($i = 0; $i < $za->numFiles; $i++) {
    $name = $za->getNameIndex($i);
    if ($name === false) {
        continue;
    }
    // Normaliza separadores '\' -> '/' (bug Compress-Archive) y sanea.
    $norm = ltrim(str_replace('\\', '/', $name), '/');
    if ($norm === '' || strpos($norm, '..') !== false) {
        continue;
    }
    // NUNCA tocar la API (vive en public_html/api).
    if ($norm === 'api' || strpos($norm, 'api/') === 0) {
        continue;
    }
    $dest = $target . '/' . $norm;
    if (substr($norm, -1) === '/') {
        if (!is_dir($dest)) {
            @mkdir($dest, 0775, true);
        }
        continue;
    }
    $dir = dirname($dest);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $stream = $za->getStream($name);
    if ($stream === false) {
        $errors++;
        continue;
    }
    $out = @fopen($dest, 'wb');
    if ($out === false) {
        fclose($stream);
        $errors++;
        continue;
    }
    stream_copy_to_stream($stream, $out);
    fclose($out);
    fclose($stream);
    $written++;
}
$za->close();

// Limpieza: borra el zip y este script.
@unlink($zipPath);
@unlink(__FILE__);

echo "ok written=$written errors=$errors";
