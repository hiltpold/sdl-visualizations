curl -X POST -H "Content-Type: application/json" --data @sdl_process_entities.json -u admin:admin http://localhost:21000/api/atlas/v2/types/typedefs?

curl -X POST -H "Content-Type: application/json" --data @sdl_entities.json -u admin:admin http://localhost:21000/api/atlas/v2/entity/bulk?
