# Gymnasia Stickers 🌍

Globe 3D de tous les endroits où un membre du club Gymnasia a collé un sticker.
Site : https://vincentdfvh.github.io/gymnasia-stickers/

Sur le site on peut : ajouter un sticker (avec photo), ajouter / renommer des membres, supprimer un sticker.
Toute modification demande le **code du club** (une seule fois par appareil).

## Base de données (Supabase, gratuit)
1. Crée un projet sur https://supabase.com
2. SQL Editor → colle `supabase-setup.sql` (change `CODE_DU_CLUB` d'abord) → Run
3. Project Settings → API → copie l'URL et la clé `anon`/`publishable` dans `config.js`

Sans `config.js` rempli, le site tourne en « mode local » : les modifs restent dans le navigateur.
`data.js` sert de données de départ pour ce mode.

Pour changer le code du club plus tard (SQL Editor) :
`update private.club set code = 'nouveau-code';`
