class Parent {
  greet() {
    console.log('hi, i am a ' + this.getTitle());
  }

  getTitle() {
    return 'parent';
  }
}

class Child extends Parent {
  greet() {
    super.greet();
  }

  getTitle() {
    return super.getTitle() + ' child';
  }
}

let person1: Parent = new Parent();
person1.greet();

let person2: Parent = new Child();
person2.greet();
// greet calls Child's method
// child's method call's Parent's greet method
// Parent's greet method calss its own getTitle() method
// since it's child, it call's child's getTitle() method
// child's getTitle calls Parent's getTitle and adds to it()
/*
  $ ts-node server/__tests__/class.ts
  hi, i am a parent
  hi, i am a parent child
*/