import program from 'commander';
import fuseExpress, { FileType, ENOENT } from 'fuse-express';
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

  const rootTypes = [
    "users",
    "groups",
    "roles",
    "projects",
    "schemas",
    "microschemas"
  ];

  app.ls("/", (req, res) => {
    console.log("ls called!", req.path);
    res.send(rootTypes.map(name => ({
      name,
      mode: FileType.DIRECTORY | 0o755
    })));
  });

  app.ls("/:type", async (req, res) => {
    const type = req.params.type;
    const entities = await api.get(`/${type}`);
    res.send(entities.data.map((entity: any) => ({
      name: name(entity) + ".json",
      mode: FileType.REGULAR_FILE | 0o644,
      size: JSON.stringify(entity, undefined, 2).length,
      mtime: new Date(entity.edited)
    })));
  })

  app.read("/:type/:filename", async (req, res) => {
    console.log("Reading file");
    const { filename, type } = req.params
    console.log(filename);
    const match = /^(.*)\.json$/.exec(filename);
    if (!match) {
      return res.status(ENOENT).send("");
    }
    const entities = await api.get(`/${type}`);
    const entity = entities.data.find((entity: any) => name(entity) === match[1]);
    res.send(JSON.stringify(entity, undefined, 2));
  })

  app.mount(dir);
}

function name(entity: any) {
  return entity.name || entity.username;
}