import program from 'commander';
import fuseExpress, { FileType } from 'fuse-express';
import rp from 'request-promise';

const api = rp.defaults({
  baseUrl: "http://localhost:8080/api/v1",
  json: true,
  jar: rp.jar()
});

program
  .version('0.0.1')
  .command("mount <dir>")
  .description("Mount a mesh instance to <dir>")
  .action(dir => mount(dir))

program.parse(process.argv);

async function mount(dir: string) {
  await api.post('/auth/login', {
    body: {
      username: "admin",
      password: "admin"
    }
  });

  const app = fuseExpress();

  app.ls("/", (req, res) => {
    console.log("ls called!", req.path);
    res.send([
      "users",
      "groups",
      "roles",
      "projects",
      "schemas",
      "microschemas"
    ].map(name => ({
      name,
      mode: FileType.DIRECTORY | 0o755
    })));
  });

  app.ls("/schemas", async (req, res) => {
    const schemas = await api.get('/schemas');
    res.send(schemas.data.map((schema: any) => ({
      name: schema.name + ".json",
      mode: FileType.REGULAR_FILE | 0o644,
      size: JSON.stringify(schema, undefined, 2).length,
      mtime: new Date(schema.edited)
    })));
  })

  app.mount(dir);
}