FROM denoland/deno:1.14.3 as builder
WORKDIR /app
RUN deno cache --unstable https://deno.land/x/dext@0.10.5/cli.ts
COPY tsconfig.json tsconfig.json
RUN deno cache -c tsconfig.json
COPY . .
RUN deno run --allow-read --allow-write --allow-env --allow-net --allow-run --unstable --no-check https://deno.land/x/dext@0.10.5/cli.ts build

FROM denoland/deno:1.14.3
WORKDIR /app
RUN deno cache --unstable https://deno.land/x/dext@0.10.5/cli.ts
COPY --from=builder /app/.dext /app/.dext
CMD [ "deno", "run", "--allow-read", "--allow-net", "--allow-env", "--unstable", "--no-check", "https://deno.land/x/dext@0.10.5/cli.ts", "start" ]
