# projects-jooba
test

## 3D model on the home page

The site displays a 3D model in a viewer. Use **GLB** (or **GLTF**) format for best results:

1. **Export your model as GLB**
   - **Blender:** File → Export → glTF 2.0 (`.glb`)
   - **Maya / 3ds Max:** Use the glTF exporter or export FBX then convert with [glTF pipeline](https://github.com/CesiumGS/gltf-pipeline) or an online converter
   - **Online:** Convert FBX/OBJ to GLB at [products.aspose.app/3d/conversion/fbx-to-glb](https://products.aspose.app/3d/conversion/fbx-to-glb) or similar

2. **Add the file to the project**
   - Save the file as `model.glb`
   - Put it in the `public/` folder (so it is available at `/model.glb`)

The viewer will load `public/model.glb` automatically. Avoid very large files; compressing or simplifying the mesh in your 3D app can help.
