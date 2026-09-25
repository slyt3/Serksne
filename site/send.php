<?php
/**
 * Vila Šerkšnė – užklausos formos apdorojimas (PHP mail()).
 * Veikia su PHP 7.4+ įprastame shared hostinge.
 * Apsauga nuo šlamšto: honeypot laukas + minimalus pildymo laikas + nuorodų limitas.
 */

date_default_timezone_set('Europe/Vilnius');

const MAIL_TO   = 'info@vilaserksne.lt';
const MAIL_FROM = 'info@vilaserksne.lt';   // turi būti to paties domeno adresas (SPF)
const MIN_FILL_MS = 3000;                  // greičiau užpildytą formą laikome robotu

/** UTF-8 saugus trumpinimas (veikia ir be mbstring plėtinio). */
function cut(string $s, int $max): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $max, 'UTF-8');
    }
    return preg_match('/^.{0,' . $max . '}/us', $s, $m) ? $m[0] : '';
}

function go_back(string $status): void
{
    $lang = isset($_POST['kalba']) && $_POST['kalba'] === 'en' ? 'en/' : './';
    header('Location: ' . $lang . '?uzklausa=' . $status . '#uzklausa', true, 303);
    exit;
}

/** Vienos eilutės laukas: be eilučių lūžių (apsauga nuo antraščių injekcijos). */
function line(string $key, int $max): string
{
    $v = isset($_POST[$key]) ? (string) $_POST[$key] : '';
    $v = trim(preg_replace('/[\r\n\t\x00-\x1F\x7F]+/u', ' ', $v));
    return cut($v, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    go_back('klaida');
}

// 1. Honeypot: robotai užpildo paslėptą lauką – apsimetame, kad pavyko
if (!empty($_POST['svetaine'])) {
    go_back('ok');
}

// 2. Pildymo laikas (matuoja naršyklė; be JS lauko nėra ir tikrinimas praleidžiamas)
$elapsed = isset($_POST['laikas']) && $_POST['laikas'] !== '' ? (int) $_POST['laikas'] : null;
if ($elapsed !== null && $elapsed < MIN_FILL_MS) {
    go_back('ok');
}

$name   = line('vardas', 100);
$phone  = line('telefonas', 30);
$email  = line('el_pastas', 150);
$date   = line('data', 20);
$guests = line('sveciai', 6);
$type   = line('tipas', 60);
$msg    = isset($_POST['zinute']) ? cut(trim(str_replace("\0", '', (string) $_POST['zinute'])), 3000) : '';

// 3. Validacija
if ($name === '' || ($phone === '' && $email === '')) {
    go_back('truksta');
}
if ($phone !== '' && !preg_match('/^[0-9 +()\-]{6,20}$/', $phone)) {
    go_back('truksta');
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    go_back('truksta');
}
if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    $date = '';
}
if ($guests !== '' && !ctype_digit($guests)) {
    $guests = '';
}
// 4. Šlamštas su nuorodomis
if (preg_match_all('~https?://|www\.~i', $msg . ' ' . $name) > 2) {
    go_back('ok');
}

$subject = 'Užklausa iš svetainės' . ($type !== '' ? ': ' . $type : '') . ' – ' . $name;

$body  = "Nauja užklausa iš vilaserksne.lt\n";
$body .= str_repeat('-', 40) . "\n";
$body .= "Vardas:          $name\n";
$body .= "Telefonas:       " . ($phone ?: '–') . "\n";
$body .= "El. paštas:      " . ($email ?: '–') . "\n";
$body .= "Šventės data:    " . ($date ?: '–') . "\n";
$body .= "Svečių skaičius: " . ($guests ?: '–') . "\n";
$body .= "Šventės tipas:   " . ($type ?: '–') . "\n";
$body .= str_repeat('-', 40) . "\n";
$body .= ($msg !== '' ? $msg : '(žinutės nėra)') . "\n\n";
$body .= "Išsiųsta: " . date('Y-m-d H:i') . "\n";

$headers = [
    'From: =?UTF-8?B?' . base64_encode('Vila Šerkšnė svetainė') . '?= <' . MAIL_FROM . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: PHP',
];
if ($email !== '') {
    $headers[] = 'Reply-To: ' . $email;
}

$ok = @mail(
    MAIL_TO,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $body,
    implode("\r\n", $headers),
    '-f' . MAIL_FROM
);

go_back($ok ? 'ok' : 'klaida');
