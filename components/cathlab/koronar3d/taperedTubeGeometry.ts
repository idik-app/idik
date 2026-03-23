import {
  BufferGeometry,
  Float32BufferAttribute,
  Vector2,
  Vector3,
} from "three";
import type { Curve } from "three";

/**
 * Tabung sepanjang kurva dengan jari-jari membesar/mengecil (proximal → distal).
 * Berbasis logika TubeGeometry Three.js dengan radius bervariasi per ring.
 */
export function createTaperedTubeGeometry(
  path: Curve<Vector3>,
  tubularSegments: number,
  radialSegments: number,
  radiusStart: number,
  radiusEnd: number,
  closed = false
): BufferGeometry {
  const geometry = new BufferGeometry();
  const frames = path.computeFrenetFrames(tubularSegments, closed);

  const vertex = new Vector3();
  const normal = new Vector3();
  const uv = new Vector2();
  let P = new Vector3();

  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  function generateSegment(i: number) {
    const t = tubularSegments > 0 ? i / tubularSegments : 0;
    const radius = radiusStart + (radiusEnd - radiusStart) * t;

    P = path.getPointAt(t, P);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);

      normal.x = cos * N.x + sin * B.x;
      normal.y = cos * N.y + sin * B.y;
      normal.z = cos * N.z + sin * B.z;
      normal.normalize();

      normals.push(normal.x, normal.y, normal.z);

      vertex.x = P.x + radius * normal.x;
      vertex.y = P.y + radius * normal.y;
      vertex.z = P.z + radius * normal.z;
      vertices.push(vertex.x, vertex.y, vertex.z);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    generateSegment(i);
  }
  generateSegment(closed ? 0 : tubularSegments);

  for (let i = 0; i <= tubularSegments; i++) {
    for (let j = 0; j <= radialSegments; j++) {
      uv.x = i / tubularSegments;
      uv.y = j / radialSegments;
      uvs.push(uv.x, uv.y);
    }
  }

  for (let j = 1; j <= tubularSegments; j++) {
    for (let i = 1; i <= radialSegments; i++) {
      const a = (radialSegments + 1) * (j - 1) + (i - 1);
      const b = (radialSegments + 1) * j + (i - 1);
      const c = (radialSegments + 1) * j + i;
      const d = (radialSegments + 1) * (j - 1) + i;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));

  return geometry;
}
