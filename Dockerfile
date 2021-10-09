FROM denoland/deno:1.14.3
WORKDIR /app
COPY . .
RUN deno install --allow-read --allow-write --allow-env --allow-net --allow-run --unstable --no-check -f -n dext https://deno.land/x/dext@0.10.5/cli.ts
RUN deno build
CMD ["deno", "start"]
