#!/bin/sh
set -e

for secret_var in $(env | grep '_FILE=' | sed 's/=.*//'); do
  var_name=$(echo "$secret_var" | sed 's/_FILE$//')
  file_path=$(eval echo \$$secret_var)
  if [ -f "$file_path" ]; then
    val=$(cat "$file_path")
    export "$var_name"="$val"
  fi
done

exec "$@"
