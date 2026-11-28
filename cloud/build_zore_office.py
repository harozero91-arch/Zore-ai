import bpy, math, os
from mathutils import Vector

OUT=os.environ["ZORE_OUTPUT_DIR"]
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
    pass

def material(name, color, metallic=0.0, roughness=0.55):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(*color,1)
    bs.inputs["Metallic"].default_value=metallic
    bs.inputs["Roughness"].default_value=roughness
    return m

ivory=material("Warm ivory plaster",(0.72,.66,.55),0,.82)
cream=material("Ceiling cream",(.86,.81,.70),0,.8)
walnut=material("Dark walnut wood",(.19,.085,.045),0,.38)
walnut2=material("Walnut highlights",(.31,.16,.085),0,.42)
brass=material("Brushed champagne brass",(.58,.39,.16),.72,.28)
marble=material("Cream marble",(.68,.64,.56),.08,.28)
green=material("Deep emerald upholstery",(.035,.19,.135),0,.72)
leather=material("Cognac leather",(.30,.12,.055),0,.62)
black=material("Graphite metal",(.035,.045,.05),.65,.35)
glass=material("Smoked blue glass",(.12,.23,.27),.35,.18)
skin=material("Character skin",(.58,.34,.22),0,.78)
navy=material("Employee navy fabric",(.045,.075,.12),0,.82)
sage=material("Employee sage fabric",(.16,.27,.20),0,.82)
white=material("Paper and ceramic",(.82,.80,.72),0,.5)

def bevel(obj, amount=.06, segments=3):
    mod=obj.modifiers.new("Soft crafted edges","BEVEL"); mod.width=amount; mod.segments=segments
    obj.modifiers.new("Weighted corner normals","WEIGHTED_NORMAL")
    return obj

def cube(name, loc, scale, mat, bevel_amt=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=name
    o.dimensions=scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:o.data.materials.append(mat)
    if bevel_amt:bevel(o,min(bevel_amt,min(scale)*.22))
    return o

def cyl(name, loc, radius, depth, mat, vertices=32, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation or (0,0,0))
    o=bpy.context.object;o.name=name
    if mat:o.data.materials.append(mat)
    bevel(o,.018,2);return o

def sphere(name, loc, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=loc);o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:o.data.materials.append(mat)
    return o

def text_obj(body, loc, size, mat, extrude=.008):
    cu=bpy.data.curves.new("Engraved lettering","FONT");cu.body=body;cu.size=size;cu.extrude=extrude;cu.align_x="CENTER"
    o=bpy.data.objects.new(body,cu);bpy.context.collection.objects.link(o);o.location=loc
    if mat:o.data.materials.append(mat)
    return o

# Architectural shell: open-front executive office for clear viewing.
cube("Polished marble floor",(0,0,-.18),(24,18,.32),marble,.08)
cube("Rear plaster wall",(0,8.85,4.1),(24,.35,8.5),ivory,.04)
cube("Left return wall",(-11.85,0,4.1),(.3,17.7,8.5),ivory,.04)
cube("Right return wall",(11.85,0,4.1),(.3,17.7,8.5),ivory,.04)
cube("Ceiling floating cornice",(0,8.55,8.15),(23.8,.55,.22),brass,.035)
# Walnut panel wall with repeated brass reveals.
for x in [i*1.65-10.7 for i in range(14)]:
    cube("Full height walnut wall panel",(x,8.62,4.1),(1.48,.10,7.6),walnut,.025)
    cube("Panel brass reveal",(x+.77,8.54,4.1),(.035,.035,7.35),brass,.008)
cube("Feature wall inset",(0,8.48,4.35),(8.2,.10,4.7),walnut2,.04)
cube("ZORE plaque backing",(0,8.38,5.45),(5.6,.10,1.15),brass,.035)
cube("ZORE plaque dark inset",(0,8.30,5.45),(5.35,.08,.92),walnut,.025)
# Text faces toward the room (-Y).
logo=text_obj("ZORE AI",(0,8.20,5.27),.62,brass,.012);logo.rotation_euler[0]=math.radians(90)
sub=text_obj("EXECUTIVE WORKSPACE",(0,8.20,4.83),.16,cream,.004);sub.rotation_euler[0]=math.radians(90)
# Tall side windows and frames.
for x in [-9.7,-6.8,6.8,9.7]:
    cube("Panoramic window",(x,8.55,4.4),(2.25,.06,4.7),glass,.02)
    for dx in [-1.16,1.16]:cube("Window brass stile",(x+dx,8.48,4.4),(.055,.08,4.85),brass,.01)
    cube("Window sill",(x,8.43,2.0),(2.4,.22,.10),brass,.015)
# Executive desk in the rear half.
cube("Executive desk walnut top",(0,3.2,1.55),(5.8,2.0,.22),walnut,.09)
cube("Executive desk brass reveal",(0,3.2,1.42),(5.82,2.02,.055),brass,.018)
for x in [-2.15,2.15]:
    cube("Executive desk pedestal",(x,3.2,.78),(.72,1.55,1.3),walnut2,.07)
cube("Desk leather writing pad",(0,3.05,1.69),(3.0,1.15,.035),green,.02)
cube("Desk monitor",(0,4.0,2.35),(1.65,.10,1.05),black,.045)
cube("Monitor glass",(0,3.94,2.36),(1.48,.025,.86),glass,.018)
cube("Monitor stand",(0,4.0,1.82),(.18,.16,.42),brass,.025)
# Desk accessories.
cube("Desk document tray",(-1.85,2.85,1.76),(.85,.55,.09),black,.025)
for i in range(3):cube("Stacked presentation folders",(-1.85,2.85,1.83+i*.045),(.7,.42,.035),white,.008)
cyl("Desk pen holder",(1.9,3.1,1.86),.13,.30,brass)
# Executive chair behind desk, facing desk/front of room.
cube("Executive chair seat",(0,5.0,1.15),(1.25,1.15,.28),leather,.12)
cube("Executive chair back",(0,5.55,2.0),(1.25,.28,1.65),leather,.12)
cyl("Executive chair column",(0,5.0,.62),.10,.78,brass)
for a in range(5):
    ang=a*math.tau/5
    cube("Executive chair star base",(math.cos(ang)*.48,5.0+math.sin(ang)*.48,.20),(.72,.10,.09),black,.035)
# Meeting table in foreground; chairs face toward table.
cube("Conference table walnut slab",(0,-3.0,1.32),(7.6,2.0,.20),walnut,.10)
cube("Conference table brass edge",(0,-3.0,1.20),(7.62,2.02,.055),brass,.018)
for x in [-2.8,2.8]:cube("Conference table pedestal",(x,-3.0,.62),(.45,1.45,1.15),black,.06)
cube("Conference table runner",(0,-3.0,1.44),(3.8,.36,.035),green,.02)
# Meeting chairs on both long sides, seats/back orientation toward table.
for x in [-2.7,-.9,.9,2.7]:
    # front row faces +Y
    cube("Meeting chair seat",(x,-4.75,.82),(.95,.95,.20),green,.10)
    cube("Meeting chair back",(x,-5.18,1.42),(.95,.20,1.05),green,.10)
    cyl("Meeting chair pedestal",(x,-4.75,.40),.075,.65,brass)
    # far row faces -Y
    cube("Meeting chair seat",(x,-1.25,.82),(.95,.95,.20),green,.10)
    cube("Meeting chair back",(x,-.82,1.42),(.95,.20,1.05),green,.10)
    cyl("Meeting chair pedestal",(x,-1.25,.40),.075,.65,brass)
# Side workstations with task chairs.
for x in [-8.2,8.2]:
    cube("Side workstation desk",(x,1.1,1.25),(3.0,1.35,.16),walnut2,.06)
    for dx in [-1.05,1.05]:cube("Workstation leg",(x+dx,1.1,.62),(.12,1.05,1.1),black,.02)
    cube("Workstation screen",(x,1.55,2.0),(1.1,.10,.72),black,.035)
    cube("Workstation display",(x,1.49,2.0),(.96,.025,.58),glass,.01)
# Decorative divider with vertical slats.
cube("Timber divider base",(-5.4,-1.2,1.0),(.18,5.3,2.0),walnut,.04)
for i in range(13):
    y=-3.65+i*.41
    cube("Divider vertical slat",(-5.4,y,2.25),(.11,.12,2.5),walnut2,.025)
cube("Divider brass cap",(-5.4,-1.2,3.55),(.18,5.35,.09),brass,.02)
# Columns, ceiling details, recessed lights.
for x in [-10,10]:
    cyl("Decorative brass column",(x,5.4,3.8),.13,7.5,brass)
    cyl("Column capital",(x,5.4,7.55),.27,.20,walnut2)
for x in [-8,-4,0,4,8]:
    cube("Ceiling recessed light",(x,1.0,7.9),(1.5,.65,.08),brass,.04)
    cube("Ceiling diffuser",(x,1.0,7.84),(1.28,.48,.04),cream,.025)
# Indoor planters with leaves.
for x,y in [(-9,-5),(9,-5),(-9,5),(9,5)]:
    cyl("Planter pot",(x,y,.42),.48,.82,walnut2,24)
    cyl("Planter brass rim",(x,y,.82),.50,.09,brass,24)
    for j in range(7):
        a=j*math.tau/7
        leaf=sphere("Broad indoor plant leaf",(x+math.cos(a)*.36,y+math.sin(a)*.36,1.45),(.18,.12,.78),sage)
        leaf.rotation_euler[1]=math.cos(a)*.35;leaf.rotation_euler[0]=math.sin(a)*.35
    cyl("Plant central stem",(x,y,1.25),.055,.9,sage,12)
# Stylized 3D employees: torso, head, hair, arms and legs.
def employee(name,x,y,cloth,face_y=0):
    # seated/standing figure assembled as separate meshes, facing into work zone
    sphere(name+" torso",(x,y,1.35),(.38,.25,.62),cloth)
    sphere(name+" head",(x,y,2.18),(.29,.29,.34),skin)
    sphere(name+" hair",(x,y,2.40),(.30,.30,.18),walnut)
    # neck
    cyl(name+" neck",(x,y,1.88),.12,.22,skin)
    # arms angled down to desk
    for side in [-1,1]:
        arm=cube(name+" arm",(x+side*.43,y-.02,1.52),(.19,.20,.72),cloth,.07)
        arm.rotation_euler[2]=side*.20
        leg=cube(name+" leg",(x+side*.16,y,.48),(.22,.25,.82),navy,.07)
    return
employee("ZORE employee one",-2.2,5.0,navy)
employee("ZORE employee two",-7.6,2.0,sage)
employee("ZORE employee three",7.6,2.0,navy)
# A few sculptural objects.
for x in [-1.5,1.5]:
    cyl("Table centerpiece bowl",(x,-3,1.56),.22,.10,brass)
# Camera and soft studio lights are included in the blend file for future editing.
bpy.ops.object.camera_add(location=(20,-27,19))
cam=bpy.context.object;cam.name="ZORE Office Presentation Camera"
direction=Vector((0,0,2.4))-cam.location;cam.rotation_euler=direction.to_track_quat("-Z","Y").to_euler();cam.data.lens=38
bpy.context.scene.camera=cam
for name,loc,power,size in [("Large softbox key",(-8,-5,12),2600,9),("Warm wall wash",(2,7,10),1800,7),("Meeting fill",(9,-1,9),1500,6)]:
    bpy.ops.object.light_add(type="AREA", location=loc);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape="DISK";l.data.size=size;l.rotation_euler=(Vector((0,0,2.5))-l.location).to_track_quat("-Z","Y").to_euler()
# Organize blend settings.
scene=bpy.context.scene
scene.render.engine="BLENDER_EEVEE_NEXT"
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world.color=(.22,.22,.22)
scene.view_settings.view_transform="AgX"
# Save native project and export complete scene as GLB.
blend_path=os.path.join(OUT,"zore-ai-executive-office.blend")
glb_path=os.path.join(OUT,"zore-ai-executive-office.glb")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
bpy.ops.export_scene.gltf(filepath=glb_path,export_format="GLB",export_apply=True)
print("ZORE_OFFICE_EXPORT_OK")
